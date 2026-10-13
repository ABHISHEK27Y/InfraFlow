/**
 * Team Workspaces Types
 * Defines the structure for RBAC, SSO, and team management
 */

export type UserRole =
  | "owner"
  | "admin"
  | "editor"
  | "viewer"
  | "billing";

export type Permission =
  | "projects.create"
  | "projects.read"
  | "projects.update"
  | "projects.delete"
  | "projects.share"
  | "projects.transfer"
  | "diagrams.create"
  | "diagrams.read"
  | "diagrams.update"
  | "diagrams.delete"
  | "diagrams.export"
  | "templates.create"
  | "templates.read"
  | "templates.update"
  | "templates.delete"
  | "templates.publish"
  | "costs.read"
  | "costs.manage"
  | "policies.read"
  | "policies.manage"
  | "drift.read"
  | "drift.manage"
  | "integrations.read"
  | "integrations.manage"
  | "team.members.invite"
  | "team.members.remove"
  | "team.members.manage-roles"
  | "team.settings.manage"
  | "team.billing.manage"
  | "team.audit.read"
  | "sso.configure";

export interface RoleDefinition {
  role: UserRole;
  name: string;
  description: string;
  permissions: Permission[];
  isSystem: boolean;
}

export interface TeamMember {
  id: string;
  userId: string;
  email: string;
  name: string;
  avatar?: string;
  role: UserRole;
  customRoleId?: string;
  status: "active" | "pending" | "suspended";
  joinedAt: string;
  lastActiveAt?: string;
  invitedBy?: string;
  invitedAt?: string;
  ssoIdentityId?: string;
}

export interface Team {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  ownerId: string;
  plan: TeamPlan;
  settings: TeamSettings;
  members: TeamMember[];
  customRoles: CustomRole[];
  ssoConfig?: SSOConfig;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  projectCount: number;
}

export type TeamPlan = "free" | "pro" | "enterprise";

export interface TeamSettings {
  allowPublicProjects: boolean;
  requireSSO: boolean;
  allowExternalCollaborators: boolean;
  defaultProjectVisibility: "private" | "team" | "public";
  sessionTimeoutMinutes: number;
  maxProjects: number;
  maxMembers: number;
  auditLogRetentionDays: number;
  allowedEmailDomains?: string[];
  ipAllowlist?: string[];
}

export interface CustomRole {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isSystem: false;
}

export interface SSOConfig {
  id: string;
  teamId: string;
  provider: SSOProvider;
  status: "configured" | "enabled" | "disabled" | "error";
  config: SSOProviderConfig;
  attributeMapping: SSOAttributeMapping;
  groupsMapping: SSOGroupsMapping;
  createdAt: string;
  updatedAt: string;
  lastTestedAt?: string;
  testStatus?: "success" | "failed";
  testError?: string;
}

export type SSOProvider = "saml" | "oidc" | "ldap" | "azure-ad" | "okta" | "auth0" | "google-workspace" | "github" | "gitlab";

export interface SSOProviderConfig {
  // SAML
  entityId?: string;
  ssoUrl?: string;
  sloUrl?: string;
  certificate?: string;
  // OIDC
  clientId?: string;
  clientSecret?: string;
  issuer?: string;
  authorizationUrl?: string;
  tokenUrl?: string;
  userInfoUrl?: string;
  scopes?: string[];
  // LDAP
  serverUrl?: string;
  bindDn?: string;
  bindPassword?: string;
  searchBase?: string;
  searchFilter?: string;
  // Generic
  domain?: string;
}

export interface SSOAttributeMapping {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  groups?: string;
}

export interface SSOGroupsMapping {
  enabled: boolean;
  adminGroups: string[];
  editorGroups: string[];
  viewerGroups: string[];
  defaultRole: UserRole;
}

export interface SSOIdentity {
  id: string;
  teamId: string;
  userId: string;
  provider: SSOProvider;
  externalId: string;
  email: string;
  attributes: Record<string, unknown>;
  groups: string[];
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface Invitation {
  id: string;
  teamId: string;
  email: string;
  role: UserRole;
  customRoleId?: string;
  invitedBy: string;
  invitedAt: string;
  expiresAt: string;
  status: "pending" | "accepted" | "expired" | "revoked";
  acceptedAt?: string;
  acceptedBy?: string;
}

export interface AuditLogEntry {
  id: string;
  teamId: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  resourceName?: string;
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  severity: "info" | "warning" | "critical";
}

export interface TeamActivity {
  id: string;
  teamId: string;
  type: "member_joined" | "member_left" | "member_role_changed" | "project_created" | "project_deleted" | "template_published" | "sso_configured" | "settings_changed";
  userId: string;
  userName: string;
  userAvatar?: string;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface TeamInviteRequest {
  email: string;
  role: UserRole;
  customRoleId?: string;
  message?: string;
}

export interface TeamMemberUpdateRequest {
  role?: UserRole;
  customRoleId?: string | null;
  status?: "active" | "suspended";
}

export interface TeamSettingsUpdateRequest {
  allowPublicProjects?: boolean;
  requireSSO?: boolean;
  allowExternalCollaborators?: boolean;
  defaultProjectVisibility?: "private" | "team" | "public";
  sessionTimeoutMinutes?: number;
  maxProjects?: number;
  maxMembers?: number;
  auditLogRetentionDays?: number;
  allowedEmailDomains?: string[];
  ipAllowlist?: string[];
}

export interface SSOConfigRequest {
  provider: SSOProvider;
  config: SSOProviderConfig;
  attributeMapping: SSOAttributeMapping;
  groupsMapping: SSOGroupsMapping;
}

export interface SSOTestResult {
  success: boolean;
  message?: string;
  userInfo?: {
    externalId: string;
    email: string;
    attributes: Record<string, unknown>;
    groups: string[];
  };
  error?: string;
}

export interface TeamPlanLimits {
  free: {
    maxMembers: 5;
    maxProjects: 10;
    maxTemplates: 20;
    ssoEnabled: false;
    auditLogDays: 7;
    apiAccess: false;
    prioritySupport: false;
  };
  pro: {
    maxMembers: 50;
    maxProjects: 100;
    maxTemplates: 200;
    ssoEnabled: true;
    auditLogDays: 90;
    apiAccess: true;
    prioritySupport: false;
  };
  enterprise: {
    maxMembers: -1; // unlimited
    maxProjects: -1;
    maxTemplates: -1;
    ssoEnabled: true;
    auditLogDays: 365;
    apiAccess: true;
    prioritySupport: true;
    customSLA: true;
    dedicatedSupport: true;
  };
}

export interface UserTeamSummary {
  teamId: string;
  teamName: string;
  teamSlug: string;
  role: UserRole;
  plan: TeamPlan;
  memberCount: number;
  projectCount: number;
  isOwner: boolean;
}