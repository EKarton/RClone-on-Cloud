export interface RawListFolderResponse {
  list: {
    Path: string;
    Name: string;
    Size?: number;
    MimeType: string;
    ModTime?: string;
    IsDir: boolean;
  }[];
}

export interface ListFolderResponse {
  items: {
    path: string;
    name: string;
    size?: number;
    mimeType?: string;
    modTime?: Date;
    isDir: boolean;
  }[];
}
