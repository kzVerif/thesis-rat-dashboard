export type SystemFile = {
  id: string;
  original_name: string;
  filename: string;
  content_type: string;
  extension: string;
  file_size: number;
  hash_sha256: string;
  uploaded_by: string;
  uploader: string;
  created_at: string;
};

export type FilesPagination = {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
};

export type FilesResponse = {
  files: SystemFile[];
  pagination: FilesPagination;
};

export type FileMutationResponse = {
  message: string;
  file: SystemFile;
};
