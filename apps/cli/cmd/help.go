package cmd

import (
	"context"
	"fmt"
	"io"
	"os"
	"regexp"
	"runtime/pprof"
	"sort"
	"strings"

	"github.com/ekarton/RClone-Cloud/apps/cli/cmd/dump"
	"github.com/ekarton/RClone-Cloud/apps/cli/cmd/migrate"
	"github.com/ekarton/RClone-Cloud/apps/web-api/rclone/configs/mongodb"
	rclonecmd "github.com/rclone/rclone/cmd"
	"github.com/rclone/rclone/fs"
	"github.com/rclone/rclone/fs/accounting"
	"github.com/rclone/rclone/fs/config"
	"github.com/rclone/rclone/fs/config/configflags"
	"github.com/rclone/rclone/fs/config/flags"
	"github.com/rclone/rclone/fs/filter"
	"github.com/rclone/rclone/fs/filter/filterflags"
	fslog "github.com/rclone/rclone/fs/log"
	"github.com/rclone/rclone/fs/log/logflags"
	"github.com/rclone/rclone/fs/rc"
	"github.com/rclone/rclone/fs/rc/rcflags"
	"github.com/rclone/rclone/fs/rc/rcserver"
	"github.com/rclone/rclone/lib/atexit"
	"github.com/rclone/rclone/lib/terminal"
	"github.com/spf13/cobra"
	"github.com/spf13/pflag"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
	"golang.org/x/text/cases"
	"golang.org/x/text/language"
)

var GeneratingDocs = false

type MongoConfig struct {
	URL        string
	Key        string
	DB         string
	Collection string
}

type Runtime struct {
	Init func(ctx context.Context, cfg MongoConfig) error
}

type rootOptions struct {
	version   bool
	mongoURL  string
	mongoKey  string
	mongoDB   string
	mongoColl string
}

type helpState struct {
	backendFlags         map[string]struct{}
	filterFlagsGroup     string
	filterFlagsRe        *regexp.Regexp
	filterFlagsNamesOnly bool
}

func defaultRuntime() Runtime {
	return Runtime{
		Init: initRuntime,
	}
}

func Execute(args []string) error {
	cmd := NewRootCommand(defaultRuntime())
	cmd.SetArgs(args)
	return cmd.Execute()
}

func NewRootCommand(rt Runtime) *cobra.Command {
	opts := &rootOptions{
		mongoDB:   "rclone",
		mongoColl: "configs",
	}
	state := &helpState{
		backendFlags: map[string]struct{}{},
	}

	root := &cobra.Command{
		Use:   "rclone-cloud",
		Short: "Show help for Rclone on Cloud commands, flags and backends.",
		Long: `Rclone on Cloud syncs files to and from cloud storage providers as well as
mounting them, listing them in lots of different ways.

See the home page (https://rclone.org/) for installation, usage,
documentation, changelog and configuration walkthroughs.`,
		Args:              cobra.NoArgs,
		DisableAutoGenTag: true,
		SilenceUsage:      true,
		SilenceErrors:     true,
		PersistentPreRunE: func(cmd *cobra.Command, args []string) error {
			cfg := MongoConfig{
				URL:        opts.mongoURL,
				Key:        opts.mongoKey,
				DB:         opts.mongoDB,
				Collection: opts.mongoColl,
			}
			return rt.Init(cmd.Context(), cfg)
		},
		PersistentPostRun: func(cmd *cobra.Command, args []string) {
			fs.Debugf("rclone-cloud", "Version %q finishing with parameters %q", fs.Version, os.Args)
			atexit.Run()
		},
		RunE: func(cmd *cobra.Command, args []string) error {
			if opts.version {
				rclonecmd.ShowVersion()
				return nil
			}
			return cmd.Usage()
		},
	}

	setupRootCommand(root, opts, state)
	return root
}

func setupRootCommand(root *cobra.Command, opts *rootOptions, state *helpState) {
	ci := fs.GetConfig(context.Background())

	configflags.AddFlags(ci, root.PersistentFlags())
	filterflags.AddFlags(root.PersistentFlags())
	rcflags.AddFlags(root.PersistentFlags())
	logflags.AddFlags(root.PersistentFlags())
	addBackendFlags(state, root.PersistentFlags())

	root.Flags().BoolVarP(&opts.version, "version", "V", false, "Print the version number")
	root.PersistentFlags().StringVar(&opts.mongoURL, "mongo-url", "", "MongoDB connection URI (env: MONGO_URL)")
	root.PersistentFlags().StringVar(&opts.mongoKey, "mongo-key", "", "MongoDB encryption key (env: MONGO_KEY)")
	root.PersistentFlags().StringVar(&opts.mongoDB, "mongo-db", "rclone", "MongoDB database name")
	root.PersistentFlags().StringVar(&opts.mongoColl, "mongo-col", "configs", "MongoDB collection name")

	cobra.AddTemplateFunc("showGlobalFlags", func(cmd *cobra.Command) bool {
		return cmd.CalledAs() == "flags" || cmd.Annotations["groups"] != ""
	})
	cobra.AddTemplateFunc("showCommands", func(cmd *cobra.Command) bool {
		return cmd.CalledAs() != "flags"
	})
	cobra.AddTemplateFunc("showLocalFlags", func(cmd *cobra.Command) bool {
		return cmd.CalledAs() != "rclone" && cmd.CalledAs() != ""
	})
	cobra.AddTemplateFunc("flagGroups", func(cmd *cobra.Command) []*flags.Group {
		backendGroup := flags.All.NewGroup("Backend", "Backend-only flags (these can be set in the config file also)")
		allRegistered := flags.All.AllRegistered()

		cmd.InheritedFlags().VisitAll(func(flag *pflag.Flag) {
			if _, ok := state.backendFlags[flag.Name]; ok {
				backendGroup.Add(flag)
				return
			}
			if _, ok := allRegistered[flag]; ok {
				return
			}
			fs.Errorf(nil, "Flag --%s is unknown", flag.Name)
		})

		groups := flags.All.
			Filter(state.filterFlagsGroup, state.filterFlagsRe, state.filterFlagsNamesOnly).
			Include(cmd.Annotations["groups"])
		return groups.Groups
	})

	root.SetUsageTemplate(usageTemplate)

	helpCommand := newHelpCommand(root)
	helpFlags := newHelpFlagsCommand(root, state)
	helpBackends := newHelpBackendsCommand()
	helpBackend := newHelpBackendCommand()

	root.SetHelpCommand(helpCommand)
	root.AddCommand(helpCommand)
	root.AddCommand(migrate.MigrateCmd)
	root.AddCommand(dump.DumpCmd)

	for _, c := range rclonecmd.Root.Commands() {
		if c.Name() == "migrate" || c.Name() == "dump" || c.Name() == "help" {
			continue
		}
		root.AddCommand(c)
	}

	helpCommand.AddCommand(helpFlags)
	helpFlagsFlags := helpFlags.Flags()
	flags.StringVarP(helpFlagsFlags, &state.filterFlagsGroup, "group", "", "", "Only include flags from specific group", "")
	flags.BoolVarP(helpFlagsFlags, &state.filterFlagsNamesOnly, "name", "", false, "Apply filter only on flag names", "")
	helpCommand.AddCommand(helpBackends)
	helpCommand.AddCommand(helpBackend)
}

func newHelpCommand(root *cobra.Command) *cobra.Command {
	return &cobra.Command{
		Use:   "help",
		Short: root.Short,
		Long:  root.Long,
		RunE: func(command *cobra.Command, args []string) error {
			root.SetOut(command.OutOrStdout())
			return root.Usage()
		},
	}
}

func newHelpFlagsCommand(root *cobra.Command, state *helpState) *cobra.Command {
	return &cobra.Command{
		Use:   "flags [<filter>]",
		Short: "Show the global flags for rclone",
		RunE: func(command *cobra.Command, args []string) error {
			command.Flags()

			if GeneratingDocs {
				root.SetUsageTemplate(docFlagsTemplate)
				return command.Usage()
			}

			state.filterFlagsRe = nil
			if len(args) > 0 {
				re, err := filter.GlobStringToRegexp(args[0], false, true)
				if err != nil {
					return fmt.Errorf("invalid flag filter: %w", err)
				}
				state.filterFlagsRe = re
				fs.Debugf(nil, "Flag filter: %s", re.String())
			}

			switch {
			case state.filterFlagsGroup != "":
				root.SetUsageTemplate(filterFlagsSingleGroupTemplate)
			case len(args) > 0:
				root.SetUsageTemplate(filterFlagsMultiGroupTemplate)
			default:
				root.SetUsageTemplate(usageTemplate)
			}

			root.SetOut(command.OutOrStdout())
			return command.Usage()
		},
	}
}

func newHelpBackendsCommand() *cobra.Command {
	return &cobra.Command{
		Use:   "backends",
		Short: "List the backends available",
		RunE: func(command *cobra.Command, args []string) error {
			return showBackends(command.OutOrStdout())
		},
	}
}

func newHelpBackendCommand() *cobra.Command {
	return &cobra.Command{
		Use:   "backend <name>",
		Short: "List full info about a backend",
		RunE: func(command *cobra.Command, args []string) error {
			if len(args) == 0 {
				return command.Usage()
			}
			return showBackend(command.OutOrStdout(), args[0])
		},
	}
}

func addBackendFlags(state *helpState, flagSet *pflag.FlagSet) {
	state.backendFlags = map[string]struct{}{}
	for _, fsInfo := range fs.Registry {
		flags.AddFlagsFromOptions(flagSet, fsInfo.Prefix, fsInfo.Options)
		for i := range fsInfo.Options {
			opt := &fsInfo.Options[i]
			state.backendFlags[opt.FlagName(fsInfo.Prefix)] = struct{}{}
		}
	}
}

func initRuntime(ctx context.Context, cfg MongoConfig) error {
	if err := fs.GlobalOptionsInit(); err != nil {
		return fmt.Errorf("failed to initialise global options: %w", err)
	}

	ci := fs.GetConfig(ctx)

	fslog.InitLogging()
	configflags.SetFlags(ci)

	mongoURI := cfg.URL
	if mongoURI == "" {
		mongoURI = os.Getenv("MONGO_URL")
	}
	if mongoURI == "" {
		return fmt.Errorf("MongoDB URI is not set; use --mongo-url or MONGO_URL")
	}

	encKey := cfg.Key
	if encKey == "" {
		encKey = os.Getenv("MONGO_KEY")
	}
	if encKey == "" {
		return fmt.Errorf("MongoDB encryption key is not set; use --mongo-key or MONGO_KEY")
	}

	mongoClient, err := mongo.Connect(options.Client().ApplyURI(mongoURI))
	if err != nil {
		return fmt.Errorf("failed to connect to MongoDB: %w", err)
	}

	mongoStore, err := mongodb.New(
		mongoClient.Database(cfg.DB).Collection(cfg.Collection),
		encKey,
	)
	if err != nil {
		_ = mongoClient.Disconnect(context.Background())
		return fmt.Errorf("failed to initialize MongoDB config storage: %w", err)
	}

	if err := mongoStore.Load(); err != nil {
		_ = mongoClient.Disconnect(context.Background())
		return fmt.Errorf("failed to load config from MongoDB: %w", err)
	}
	config.SetData(mongoStore)

	if err := mongoStore.StartWatching(ctx); err != nil {
		fs.Logf(nil, "Warning: could not start config change stream: %v", err)
	}

	atexit.Register(func() {
		mongoStore.StopWatching()
		if err := mongoClient.Disconnect(context.Background()); err != nil {
			fs.Logf(nil, "mongo disconnect: %v", err)
		}
	})

	accounting.Start(ctx)

	if ci.NoConsole {
		terminal.HideConsole()
	} else {
		terminal.EnableColorsStdout()
	}

	fs.Debugf("rclone-cloud", "Version %q starting with parameters %q", fs.Version, os.Args)

	if fslog.Opt.LogSystemdSupport {
		fs.Debugf("rclone-cloud", "systemd logging support activated")
	}

	if _, err = rcserver.Start(ctx, &rc.Opt); err != nil {
		return fmt.Errorf("failed to start remote control: %w", err)
	}

	if len(os.Args) >= 2 && os.Args[1] != "rc" {
		if _, err = rcserver.MetricsStart(ctx, &rc.Opt); err != nil {
			return fmt.Errorf("failed to start metrics server: %w", err)
		}
	}

	cpuProfileFlag := pflag.Lookup("cpuprofile")
	if cpuProfileFlag != nil && cpuProfileFlag.Value.String() != "" {
		cpuProfile := cpuProfileFlag.Value.String()
		f, err := os.Create(cpuProfile)
		if err != nil {
			return err
		}
		if err := pprof.StartCPUProfile(f); err != nil {
			_ = f.Close()
			return err
		}
		atexit.Register(func() {
			pprof.StopCPUProfile()
			_ = f.Close()
		})
	}

	memProfileFlag := pflag.Lookup("memprofile")
	if memProfileFlag != nil && memProfileFlag.Value.String() != "" {
		memProfile := memProfileFlag.Value.String()
		atexit.Register(func() {
			f, err := os.Create(memProfile)
			if err != nil {
				fs.Errorf(nil, "memory profile create error: %v", err)
				return
			}
			defer func() { _ = f.Close() }()
			if err := pprof.WriteHeapProfile(f); err != nil {
				fs.Errorf(nil, "memory profile write error: %v", err)
			}
		})
	}

	return nil
}

var usageTemplate = `Usage:{{if .Runnable}}
  {{.UseLine}}{{end}}{{if .HasAvailableSubCommands}}
  {{.CommandPath}} [command]{{end}}{{if gt (len .Aliases) 0}}

Aliases:
  {{.NameAndAliases}}{{end}}{{if .HasExample}}

Examples:
{{.Example}}{{end}}{{if and (showCommands .) .HasAvailableSubCommands}}

Available commands:{{range .Commands}}{{if (or .IsAvailableCommand (eq .Name "help"))}}
  {{rpad .Name .NamePadding}} {{.Short}}{{end}}{{end}}{{end}}{{if and (showLocalFlags .) .HasAvailableLocalFlags}}

Flags:
{{.LocalFlags.FlagUsages | trimTrailingWhitespaces}}{{end}}{{if and (showGlobalFlags .) .HasAvailableInheritedFlags}}{{range flagGroups .}}{{if .Flags.HasFlags}}

{{.Help}} (flag group {{.Name}}):
{{.Flags.FlagUsages | trimTrailingWhitespaces}}{{end}}{{end}}{{end}}{{if .HasHelpSubCommands}}
 
Additional help topics:{{range .Commands}}{{if .IsAdditionalHelpTopicCommand}}
  {{rpad .CommandPath .CommandPathPadding}} {{.Short}}{{end}}{{end}}{{end}}

Use "rclone-cloud [command] --help" for more information about a command.
Use "rclone-cloud help flags" for to see the global flags.
Use "rclone-cloud help backends" for a list of supported services.
`

var filterFlagsSingleGroupTemplate = `{{range flagGroups .}}{{if .Flags.HasFlags}}{{.Flags.FlagUsages | trimTrailingWhitespaces}}
{{end}}{{end}}
`

var filterFlagsMultiGroupTemplate = `{{range flagGroups .}}{{if .Flags.HasFlags}}{{.Help}} (flag group {{.Name}}):
{{.Flags.FlagUsages | trimTrailingWhitespaces}}

{{end}}{{end}}`

var docFlagsTemplate = `---
title: "Global Flags"
description: "Rclone Global Flags"
# autogenerated - DO NOT EDIT
---

# Global Flags

This describes the global flags available to every rclone command
split into groups.

{{range flagGroups .}}{{if .Flags.HasFlags}}
## {{.Name}}

{{.Help}}.

` + "```" + `
{{.Flags.FlagUsages | trimTrailingWhitespaces}}
` + "```" + `

{{end}}{{end}}
`

func showBackends(out io.Writer) error {
	if _, err := fmt.Fprintln(out, "All rclone backends:"); err != nil {
		return err
	}
	if _, err := fmt.Fprintln(out); err != nil {
		return err
	}

	for _, backend := range fs.Registry {
		if _, err := fmt.Fprintf(out, "  %-12s %s\n", backend.Prefix, backend.Description); err != nil {
			return err
		}
	}

	if _, err := fmt.Fprintln(out); err != nil {
		return err
	}
	if _, err := fmt.Fprintln(out, "To see more info about a particular backend use:"); err != nil {
		return err
	}
	if _, err := fmt.Fprintln(out, "  rclone help backend <name>"); err != nil {
		return err
	}
	return nil
}

func quoteString(v any) string {
	switch v.(type) {
	case string:
		return fmt.Sprintf("%q", v)
	default:
		return fmt.Sprint(v)
	}
}

func showBackend(out interface{ Write([]byte) (int, error) }, name string) error {
	backend, err := fs.Find(name)
	if err != nil {
		return err
	}

	var standardOptions, advancedOptions fs.Options
	done := map[string]struct{}{}

	for _, opt := range backend.Options {
		if _, exists := done[opt.Name]; exists {
			continue
		}
		done[opt.Name] = struct{}{}
		if opt.Advanced {
			advancedOptions = append(advancedOptions, opt)
		} else {
			standardOptions = append(standardOptions, opt)
		}
	}

	optionsType := "standard"
	for _, opts := range []fs.Options{standardOptions, advancedOptions} {
		if len(opts) == 0 {
			optionsType = "advanced"
			continue
		}

		title := cases.Title(language.Und, cases.NoLower).String(optionsType)
		_, _ = fmt.Fprintf(out, "### %s options\n\n", title)
		_, _ = fmt.Fprintf(out, "Here are the %s options specific to %s (%s).\n\n", optionsType, backend.Name, backend.Description)
		optionsType = "advanced"

		for _, opt := range opts {
			shortOpt := ""
			if opt.ShortOpt != "" {
				shortOpt = fmt.Sprintf(" / -%s", opt.ShortOpt)
			}
			_, _ = fmt.Fprintf(out, "#### --%s%s\n\n", opt.FlagName(backend.Prefix), shortOpt)
			_, _ = fmt.Fprintf(out, "%s\n\n", opt.Help)

			if opt.IsPassword {
				_, _ = fmt.Fprintf(out, "**NB** Input to this must be obscured - see [rclone obscure](/commands/rclone_obscure/).\n\n")
			}

			_, _ = fmt.Fprintf(out, "Properties:\n\n")
			_, _ = fmt.Fprintf(out, "- Config:      %s\n", opt.Name)
			_, _ = fmt.Fprintf(out, "- Env Var:     %s\n", opt.EnvVarName(backend.Prefix))
			if opt.Provider != "" {
				_, _ = fmt.Fprintf(out, "- Provider:    %s\n", opt.Provider)
			}
			_, _ = fmt.Fprintf(out, "- Type:        %s\n", opt.Type())

			defaultValue := opt.GetValue()
			if defaultValue != "" {
				_, _ = fmt.Fprintf(out, "- Default:     %s\n", quoteString(defaultValue))
			} else {
				_, _ = fmt.Fprintf(out, "- Required:    %v\n", opt.Required)
			}

			if len(opt.Examples) > 0 {
				if opt.Exclusive {
					_, _ = fmt.Fprintf(out, "- Choices:\n")
				} else {
					_, _ = fmt.Fprintf(out, "- Examples:\n")
				}
				for _, ex := range opt.Examples {
					_, _ = fmt.Fprintf(out, "  - %s\n", quoteString(ex.Value))
					for line := range strings.SplitSeq(ex.Help, "\n") {
						_, _ = fmt.Fprintf(out, "    - %s\n", line)
					}
					if ex.Provider != "" {
						_, _ = fmt.Fprintf(out, "    - Provider: %s\n", ex.Provider)
					}
				}
			}
			_, _ = fmt.Fprintf(out, "\n")
		}
	}

	if backend.MetadataInfo != nil {
		_, _ = fmt.Fprintf(out, "### Metadata\n\n")
		_, _ = fmt.Fprintf(out, "%s\n\n", strings.TrimSpace(backend.MetadataInfo.Help))

		if len(backend.MetadataInfo.System) > 0 {
			_, _ = fmt.Fprintf(out, "Here are the possible system metadata items for the %s backend.\n\n", backend.Name)

			keys := make([]string, 0, len(backend.MetadataInfo.System))
			for k := range backend.MetadataInfo.System {
				keys = append(keys, k)
			}
			sort.Strings(keys)

			_, _ = fmt.Fprintf(out, "| Name | Help | Type | Example | Read Only |\n")
			_, _ = fmt.Fprintf(out, "|------|------|------|---------|-----------|\n")
			for _, k := range keys {
				v := backend.MetadataInfo.System[k]
				ro := "N"
				if v.ReadOnly {
					ro = "**Y**"
				}
				_, _ = fmt.Fprintf(out, "| %s | %s | %s | %s | %s |\n", k, v.Help, v.Type, v.Example, ro)
			}
			_, _ = fmt.Fprintf(out, "\n")
		}

		_, _ = fmt.Fprintf(out, "See the [metadata](/docs/#metadata) docs for more info.\n\n")
	}

	return nil
}
