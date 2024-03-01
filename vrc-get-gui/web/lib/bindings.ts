/* eslint-disable */
// This file was generated by [tauri-specta](https://github.com/oscartbeaumont/tauri-specta). Do not edit this file manually.

declare global {
    interface Window {
        __TAURI_INVOKE__<T>(cmd: string, args?: Record<string, unknown>): Promise<T>;
    }
}

// Function avoids 'window not defined' in SSR
const invoke = () => window.__TAURI_INVOKE__;

export function environmentProjects() {
    return invoke()<TauriProject[]>("environment_projects")
}

export function environmentAddProjectWithPicker() {
    return invoke()<TauriAddProjectWithPickerResult>("environment_add_project_with_picker")
}

export function environmentPackages() {
    return invoke()<TauriPackage[]>("environment_packages")
}

export function environmentRepositoriesInfo() {
    return invoke()<TauriRepositoriesInfo>("environment_repositories_info")
}

export function environmentHideRepository(repository: string) {
    return invoke()<null>("environment_hide_repository", { repository })
}

export function environmentShowRepository(repository: string) {
    return invoke()<null>("environment_show_repository", { repository })
}

export function environmentSetHideLocalUserPackages(value: boolean) {
    return invoke()<null>("environment_set_hide_local_user_packages", { value })
}

export function projectDetails(projectPath: string) {
    return invoke()<TauriProjectDetails>("project_details", { projectPath })
}

export function projectInstallPackage(projectPath: string, envVersion: number, packageIndex: number) {
    return invoke()<TauriPendingProjectChanges>("project_install_package", { projectPath,envVersion,packageIndex })
}

export function projectUpgradeMultiplePackage(projectPath: string, packageIndices: ([number, number])[]) {
    return invoke()<TauriPendingProjectChanges>("project_upgrade_multiple_package", { projectPath,packageIndices })
}

export function projectRemovePackage(projectPath: string, name: string) {
    return invoke()<TauriPendingProjectChanges>("project_remove_package", { projectPath,name })
}

export function projectApplyPendingChanges(projectPath: string, changesVersion: number) {
    return invoke()<null>("project_apply_pending_changes", { projectPath,changesVersion })
}

export function projectMigrateProjectTo2022(projectPath: string, allowMismatchedUnity: boolean) {
    return invoke()<TauriMigrateProjectTo2022Result>("project_migrate_project_to_2022", { projectPath,allowMismatchedUnity })
}

export function projectFinalizeMigrationWithUnity2022(projectPath: string) {
    return invoke()<TauriFinalizeMigrationWithUnity2022>("project_finalize_migration_with_unity_2022", { projectPath })
}

export function projectOpenUnity(projectPath: string) {
    return invoke()<TauriOpenUnityResult>("project_open_unity", { projectPath })
}

export function utilOpen(path: string) {
    return invoke()<null>("util_open", { path })
}

export function utilGetLogEntries() {
    return invoke()<LogEntry[]>("util_get_log_entries")
}

export type TauriPackageChange = { InstallNew: TauriBasePackageInfo } | { Remove: TauriRemoveReason }
export type TauriRemoveReason = "Requested" | "Legacy" | "Unused"
export type TauriProjectType = "Unknown" | "LegacySdk2" | "LegacyWorlds" | "LegacyAvatars" | "UpmWorlds" | "UpmAvatars" | "UpmStarter" | "Worlds" | "Avatars" | "VpmStarter"
export type TauriRepositoriesInfo = { user_repositories: TauriUserRepository[]; hidden_user_repositories: string[]; hide_local_user_packages: boolean }
export type TauriFinalizeMigrationWithUnity2022 = { type: "NoUnity2022Found" } | { type: "UnityExistsWithStatus"; status: string } | { type: "FinishedSuccessfully" }
export type LogEntry = { time: string; level: LogLevel; target: string; message: string }
export type TauriPendingProjectChanges = { changes_version: number; package_changes: ([string, TauriPackageChange])[]; remove_legacy_files: string[]; remove_legacy_folders: string[]; conflicts: ([string, TauriConflictInfo])[] }
export type TauriAddProjectWithPickerResult = "NoFolderSelected" | "InvalidFolderAsAProject" | "Successful"
export type LogLevel = "Error" | "Warn" | "Info" | "Debug" | "Trace"
export type TauriVersion = { major: number; minor: number; patch: number; pre: string; build: string }
export type TauriUserRepository = { id: string; display_name: string }
export type TauriConflictInfo = { packages: string[]; unity_conflict: boolean }
export type TauriProjectDetails = { unity: [number, number] | null; unity_str: string; installed_packages: ([string, TauriBasePackageInfo])[] }
export type TauriMigrateProjectTo2022Result = { type: "NoUnity2022Found" } | { type: "ConfirmNotExactlyRecommendedUnity2022"; found: string; recommended: string } | { type: "MigrationInVpmFinished" }
export type TauriPackageSource = "LocalUser" | { Remote: { id: string; display_name: string } }
export type TauriProject = { list_version: number; index: number; name: string; path: string; project_type: TauriProjectType; unity: string; last_modified: number; created_at: number }
export type TauriBasePackageInfo = { name: string; display_name: string | null; aliases: string[]; version: TauriVersion; unity: [number, number] | null; changelog_url: string | null; is_yanked: boolean }
export type TauriPackage = ({ name: string; display_name: string | null; aliases: string[]; version: TauriVersion; unity: [number, number] | null; changelog_url: string | null; is_yanked: boolean }) & { env_version: number; index: number; source: TauriPackageSource }
export type TauriOpenUnityResult = "NoUnityVersionForTheProject" | "NoMatchingUnityFound" | "Success"
