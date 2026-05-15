export type ApiUser = {
  id: number;
  username: string;
  full_name: string;
  avatar_url?: string;
  initials: string;
};

export type Lookup = {
  name: string;
  color: string;
};

export type Status = Lookup & {
  is_closed: boolean;
};

export type IssueAttachment = {
  id: number;
  file_name?: string;
  file_url?: string;
  uploaded_at: string;
  uploaded_by: ApiUser;
};

export type Issue = {
  id: number;
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
  deadline: string | null;
  deadline_color: string;
  is_closed: boolean;
  created_by: ApiUser;
  assignee: ApiUser | null;
  watchers: ApiUser[];
  status: Status;
  type: Lookup;
  priority: Lookup;
  severity: Lookup;
  tags: Lookup[];
  attachments: IssueAttachment[];
};

export type IssueListResponse = {
  count: number;
  results: Issue[];
};

export type IssueWrite = {
  title: string;
  description?: string;
  deadline?: string | null;
  status?: string | null;
  type?: string | null;
  priority?: string | null;
  severity?: string | null;
  tags?: string[];
  assignee_user_id?: number | null;
  watcher_user_ids?: number[];
};

export type IssueFilters = {
  search?: string;
  sort_by?: "issue" | "status" | "type" | "priority" | "severity" | "assigned" | "updated";
  sort_direction?: "asc" | "desc";
  filter_status?: string[];
  filter_type?: string[];
  filter_priority?: string[];
  filter_severity?: string[];
  filter_tag?: string[];
  filter_assignee_username?: string[];
  filter_creator_username?: string[];
};

export type ListResponse<T> = {
  count: number;
  results: T[];
};

export type IssueComment = {
  id: number;
  content: string;
  created_at: string;
  updated_at: string;
  created_by: ApiUser;
};

export type IssueActivity = {
  id: number;
  activity_type: string;
  summary: string;
  created_at: string;
  actor: ApiUser | null;
};

export type UserDetail = ApiUser & {
  bio: string | null;
  assigned_count: number;
  watched_count: number;
};
