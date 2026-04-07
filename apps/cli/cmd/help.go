package cmd

import (
	"context"
	"fmt"
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

// Root is the main rclone command
var Root = &cobra.Command{
	Use:   "rclone-cloud",
	Short: "Show help for Rclone on Cloud commands, flags and backends.",
	Long: `Rclone on Cloud syncs files to and from cloud storage providers as well as
mounting them, listing them in lots of different ways.

See the home page (https://rclone.org/) for installation, usage,
documentation, changelog and configuration walkthroughs.`,
	Args: cobra.NoArgs,
	PersistentPostRun: func(cmd *cobra.Command, args []string) {
		fs.Debugf("rclone-cloud", "Version %q finishing with parameters %q", fs.Version, os.Args)
		atexit.Run()
	},
	DisableAutoGenTag: true,
}

// GeneratingDocs is set by rclone gendocs to alter the format of the
// output suitable for the documentation.
var (
	GeneratingDocs = false
	version        bool
)

// MongoDB connection flags
var (
	mongoURL  string
	mongoKey  string
	mongoDB   string
	mongoColl string
)

// Root help command
var (
	backendFlags map[string]struct{}
	helpCommand  = &cobra.Command{
		Use:   "help",
		Short: Root.Short,
		Long:  Root.Long,
		RunE: func(command *cobra.Command, args []string) error {
			Root.SetOut(os.Stdout)
			return Root.Usage()
		},
	}
)

// AddBackendFlags creates flags for all the backend options
func AddBackendFlags() {
	backendFlags = map[string]struct{}{}
	for _, fsInfo := range fs.Registry {
		flags.AddFlagsFromOptions(pflag.CommandLine, fsInfo.Prefix, fsInfo.Options)
		// Store the backend flag names for the help generator
		for i := range fsInfo.Options {
			opt := &fsInfo.Options[i]
			name := opt.FlagName(fsInfo.Prefix)
			backendFlags[name] = struct{}{}
		}
	}
}

// initConfig is run by cobra after initialising the flags
func initConfig() {
	// Set the global options from the flags
	err := fs.GlobalOptionsInit()
	if err != nil {
		fs.Fatalf(nil, "Failed to initialise global options: %v", err)
	}

	ctx := context.Background()
	ci := fs.GetConfig(ctx)

	// Start the logger
	fslog.InitLogging()

	// Finish parsing any command line flags
	configflags.SetFlags(ci)

	// Load the config from MongoDB
	// Flag takes precedence over env var
	mongoURI := mongoURL
	if mongoURI == "" {
		mongoURI = os.Getenv("MONGO_URL")
	}
	if mongoURI == "" {
		fs.Fatalf(nil, "MongoDB URI is not set; use --mongo-url or MONGO_URL")
	}
	encKey := mongoKey
	if encKey == "" {
		encKey = os.Getenv("MONGO_KEY")
	}
	if encKey == "" {
		fs.Fatalf(nil, "MongoDB encryption key is not set; use --mongo-key or MONGO_KEY")
	}

	mongoClient, err := mongo.Connect(options.Client().ApplyURI(mongoURI))
	if err != nil {
		fs.Fatalf(nil, "Failed to connect to MongoDB: %v", err)
	}

	mongoStore, err := mongodb.New(
		mongoClient.Database(mongoDB).Collection(mongoColl),
		encKey,
	)
	if err != nil {
		fs.Fatalf(nil, "Failed to initialize MongoDB config storage: %v", err)
	}
	if err := mongoStore.Load(); err != nil {
		fs.Fatalf(nil, "Failed to load config from MongoDB: %v", err)
	}
	config.SetData(mongoStore)

	// Start watching for external config changes
	if err := mongoStore.StartWatching(ctx); err != nil {
		fs.Logf(nil, "Warning: could not start config change stream: %v", err)
	}

	// Register cleanup for MongoDB resources
	atexit.Register(func() {
		mongoStore.StopWatching()
		if err := mongoClient.Disconnect(context.Background()); err != nil {
			fs.Logf(nil, "mongo disconnect: %v", err)
		}
	})

	// Start accounting
	accounting.Start(ctx)

	// Configure console
	if ci.NoConsole {
		// Hide the console window
		terminal.HideConsole()
	} else {
		// Enable color support on stdout if possible.
		// This enables virtual terminal processing on Windows 10,
		// adding native support for ANSI/VT100 escape sequences.
		terminal.EnableColorsStdout()
	}

	// Write the args for debug purposes
	fs.Debugf("rclone-cloud", "Version %q starting with parameters %q", fs.Version, os.Args)

	// Inform user about systemd log support now that we have a logger
	if fslog.Opt.LogSystemdSupport {
		fs.Debugf("rclone-cloud", "systemd logging support activated")
	}

	// Start the remote control server if configured
	_, err = rcserver.Start(ctx, &rc.Opt)
	if err != nil {
		fs.Fatalf(nil, "Failed to start remote control: %v", err)
	}

	// Start the metrics server if configured and not running the "rc" command
	if len(os.Args) >= 2 && os.Args[1] != "rc" {
		_, err = rcserver.MetricsStart(ctx, &rc.Opt)
		if err != nil {
			fs.Fatalf(nil, "Failed to start metrics server: %v", err)
		}
	}

	// Setup CPU profiling if desired
	cpuProfileFlag := pflag.Lookup("cpuprofile")
	if cpuProfileFlag != nil && cpuProfileFlag.Value.String() != "" {
		cpuProfile := cpuProfileFlag.Value.String()
		fs.Infof(nil, "Creating CPU profile %q\n", cpuProfile)
		f, err := os.Create(cpuProfile)
		if err != nil {
			err = fs.CountError(ctx, err)
			fs.Fatal(nil, fmt.Sprint(err))
		}
		err = pprof.StartCPUProfile(f)
		if err != nil {
			err = fs.CountError(ctx, err)
			fs.Fatal(nil, fmt.Sprint(err))
		}
		atexit.Register(func() {
			pprof.StopCPUProfile()
			err := f.Close()
			if err != nil {
				err = fs.CountError(ctx, err)
				fs.Fatal(nil, fmt.Sprint(err))
			}
		})
	}

	// Setup memory profiling if desired
	memProfileFlag := pflag.Lookup("memprofile")
	if memProfileFlag != nil && memProfileFlag.Value.String() != "" {
		memProfile := memProfileFlag.Value.String()
		atexit.Register(func() {
			fs.Infof(nil, "Saving Memory profile %q\n", memProfile)
			f, err := os.Create(memProfile)
			if err != nil {
				err = fs.CountError(ctx, err)
				fs.Fatal(nil, fmt.Sprint(err))
			}
			err = pprof.WriteHeapProfile(f)
			if err != nil {
				err = fs.CountError(ctx, err)
				fs.Fatal(nil, fmt.Sprint(err))
			}
			err = f.Close()
			if err != nil {
				err = fs.CountError(ctx, err)
				fs.Fatal(nil, fmt.Sprint(err))
			}
		})
	}
}

// to filter the flags with
var (
	filterFlagsGroup     string
	filterFlagsRe        *regexp.Regexp
	filterFlagsNamesOnly bool
)

// Show the flags
var helpFlags = &cobra.Command{
	Use:   "flags [<filter>]",
	Short: "Show the global flags for rclone",
	RunE: func(command *cobra.Command, args []string) error {
		command.Flags()
		if GeneratingDocs {
			Root.SetUsageTemplate(docFlagsTemplate)
		} else {
			if len(args) > 0 {
				re, err := filter.GlobStringToRegexp(args[0], false, true)
				if err != nil {
					return fmt.Errorf("invalid flag filter: %w", err)
				}
				fs.Debugf(nil, "Flag filter: %s", re.String())
				filterFlagsRe = re
			}
			if filterFlagsGroup != "" {
				Root.SetUsageTemplate(filterFlagsSingleGroupTemplate)
			} else if len(args) > 0 {
				Root.SetUsageTemplate(filterFlagsMultiGroupTemplate)
			}
			Root.SetOut(os.Stdout)
		}
		return command.Usage()
	},
}

// Show the backends
var helpBackends = &cobra.Command{
	Use:   "backends",
	Short: "List the backends available",
	RunE: func(command *cobra.Command, args []string) error {
		showBackends()
		return nil
	},
}

// Show a single backend
var helpBackend = &cobra.Command{
	Use:   "backend <name>",
	Short: "List full info about a backend",
	RunE: func(command *cobra.Command, args []string) error {
		if len(args) == 0 {
			Root.SetOut(os.Stdout)
			return command.Usage()
		}
		showBackend(args[0])
		return nil
	},
}

// runRoot implements the main rclone command with no subcommands
func runRoot(cmd *cobra.Command, args []string) error {
	if version {
		rclonecmd.ShowVersion()
		return nil
	}
	return cmd.Usage()
}

// setupRootCommand sets default usage, help, and error handling for
// the root command.
//
// Helpful example: https://github.com/moby/moby/blob/master/cli/cobra.go
func setupRootCommand(rootCmd *cobra.Command) {
	ci := fs.GetConfig(context.Background())
	// Add global flags
	configflags.AddFlags(ci, pflag.CommandLine)
	filterflags.AddFlags(pflag.CommandLine)
	rcflags.AddFlags(pflag.CommandLine)
	logflags.AddFlags(pflag.CommandLine)
	AddBackendFlags()

	Root.RunE = runRoot
	Root.SilenceUsage = true
	Root.SilenceErrors = true
	Root.Flags().BoolVarP(&version, "version", "V", false, "Print the version number")
	Root.PersistentFlags().StringVar(&mongoURL, "mongo-url", "", "MongoDB connection URI (env: MONGO_URL)")
	Root.PersistentFlags().StringVar(&mongoKey, "mongo-key", "", "MongoDB encryption key (env: MONGO_KEY)")
	Root.PersistentFlags().StringVar(&mongoDB, "mongo-db", "rclone", "MongoDB database name")
	Root.PersistentFlags().StringVar(&mongoColl, "mongo-col", "configs", "MongoDB collection name")

	cobra.AddTemplateFunc("showGlobalFlags", func(cmd *cobra.Command) bool {
		return cmd.CalledAs() == "flags" || cmd.Annotations["groups"] != ""
	})
	cobra.AddTemplateFunc("showCommands", func(cmd *cobra.Command) bool {
		return cmd.CalledAs() != "flags"
	})
	cobra.AddTemplateFunc("showLocalFlags", func(cmd *cobra.Command) bool {
		// Don't show local flags (which are the global ones on the root) on "rclone" and
		// "rclone help" (which shows the global help)
		return cmd.CalledAs() != "rclone" && cmd.CalledAs() != ""
	})
	cobra.AddTemplateFunc("flagGroups", func(cmd *cobra.Command) []*flags.Group {
		// Add the backend flags and check all flags
		backendGroup := flags.All.NewGroup("Backend", "Backend-only flags (these can be set in the config file also)")
		allRegistered := flags.All.AllRegistered()
		cmd.InheritedFlags().VisitAll(func(flag *pflag.Flag) {
			if _, ok := backendFlags[flag.Name]; ok {
				backendGroup.Add(flag)
			} else if _, ok := allRegistered[flag]; ok {
				// flag is in a group already
			} else {
				fs.Errorf(nil, "Flag --%s is unknown", flag.Name)
			}
		})
		groups := flags.All.Filter(filterFlagsGroup, filterFlagsRe, filterFlagsNamesOnly).Include(cmd.Annotations["groups"])
		return groups.Groups
	})
	rootCmd.SetUsageTemplate(usageTemplate)
	rootCmd.SetHelpCommand(helpCommand)
	rootCmd.AddCommand(helpCommand)
	rootCmd.AddCommand(migrate.MigrateCmd)
	rootCmd.AddCommand(dump.DumpCmd)

	// Add rclone subcommands
	for _, c := range rclonecmd.Root.Commands() {
		// Skip our custom commands if they exist in rclone too
		if c.Name() == "migrate" || c.Name() == "dump" || c.Name() == "help" {
			continue
		}
		rootCmd.AddCommand(c)
	}

	helpCommand.AddCommand(helpFlags)
	helpFlagsFlags := helpFlags.Flags()
	flags.StringVarP(helpFlagsFlags, &filterFlagsGroup, "group", "", "", "Only include flags from specific group", "")
	flags.BoolVarP(helpFlagsFlags, &filterFlagsNamesOnly, "name", "", false, "Apply filter only on flag names", "")
	helpCommand.AddCommand(helpBackends)
	helpCommand.AddCommand(helpBackend)

	cobra.OnInitialize(initConfig)
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

// show all the backends
func showBackends() {
	fmt.Printf("All rclone backends:\n\n")
	for _, backend := range fs.Registry {
		fmt.Printf("  %-12s %s\n", backend.Prefix, backend.Description)
	}
	fmt.Printf("\nTo see more info about a particular backend use:\n")
	fmt.Printf("  rclone help backend <name>\n")
}

func quoteString(v any) string {
	switch v.(type) {
	case string:
		return fmt.Sprintf("%q", v)
	}
	return fmt.Sprint(v)
}

// show a single backend
func showBackend(name string) {
	backend, err := fs.Find(name)
	if err != nil {
		fs.Fatal(nil, fmt.Sprint(err))
	}
	var standardOptions, advancedOptions fs.Options
	done := map[string]struct{}{}
	for _, opt := range backend.Options {
		// Skip if done already (e.g. with Provider options)
		if _, doneAlready := done[opt.Name]; doneAlready {
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
		optionsType = cases.Title(language.Und, cases.NoLower).String(optionsType)
		fmt.Printf("### %s options\n\n", optionsType)
		fmt.Printf("Here are the %s options specific to %s (%s).\n\n", optionsType, backend.Name, backend.Description)
		optionsType = "advanced"
		for _, opt := range opts {
			done[opt.Name] = struct{}{}
			shortOpt := ""
			if opt.ShortOpt != "" {
				shortOpt = fmt.Sprintf(" / -%s", opt.ShortOpt)
			}
			fmt.Printf("#### --%s%s\n\n", opt.FlagName(backend.Prefix), shortOpt)
			fmt.Printf("%s\n\n", opt.Help)
			if opt.IsPassword {
				fmt.Printf("**NB** Input to this must be obscured - see [rclone obscure](/commands/rclone_obscure/).\n\n")
			}
			fmt.Printf("Properties:\n\n")
			fmt.Printf("- Config:      %s\n", opt.Name)
			fmt.Printf("- Env Var:     %s\n", opt.EnvVarName(backend.Prefix))
			if opt.Provider != "" {
				fmt.Printf("- Provider:    %s\n", opt.Provider)
			}
			fmt.Printf("- Type:        %s\n", opt.Type())
			defaultValue := opt.GetValue()
			// Default value and Required are related: Required means option must
			// have a value, but if there is a default then a value does not have
			// to be explicitly set and then Required makes no difference.
			if defaultValue != "" {
				fmt.Printf("- Default:     %s\n", quoteString(defaultValue))
			} else {
				fmt.Printf("- Required:    %v\n", opt.Required)
			}
			// List examples / possible choices
			if len(opt.Examples) > 0 {
				if opt.Exclusive {
					fmt.Printf("- Choices:\n")
				} else {
					fmt.Printf("- Examples:\n")
				}
				for _, ex := range opt.Examples {
					fmt.Printf("  - %s\n", quoteString(ex.Value))
					for line := range strings.SplitSeq(ex.Help, "\n") {
						fmt.Printf("    - %s\n", line)
					}
					if ex.Provider != "" {
						fmt.Printf("    - Provider: %s\n", ex.Provider)
					}
				}
			}
			fmt.Printf("\n")
		}
	}
	if backend.MetadataInfo != nil {
		fmt.Printf("### Metadata\n\n")
		fmt.Printf("%s\n\n", strings.TrimSpace(backend.MetadataInfo.Help))
		if len(backend.MetadataInfo.System) > 0 {
			fmt.Printf("Here are the possible system metadata items for the %s backend.\n\n", backend.Name)
			keys := []string{}
			for k := range backend.MetadataInfo.System {
				keys = append(keys, k)
			}
			sort.Strings(keys)
			fmt.Printf("| Name | Help | Type | Example | Read Only |\n")
			fmt.Printf("|------|------|------|---------|-----------|\n")
			for _, k := range keys {
				v := backend.MetadataInfo.System[k]
				ro := "N"
				if v.ReadOnly {
					ro = "**Y**"
				}
				fmt.Printf("| %s | %s | %s | %s | %s |\n", k, v.Help, v.Type, v.Example, ro)
			}
			fmt.Printf("\n")
		}
		fmt.Printf("See the [metadata](/docs/#metadata) docs for more info.\n\n")
	}
}
