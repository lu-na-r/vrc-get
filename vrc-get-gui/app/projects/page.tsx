"use client"

import {
	Button,
	ButtonGroup,
	Card,
	Dialog,
	DialogBody,
	DialogFooter,
	DialogHeader,
	IconButton,
	Input,
	Menu,
	MenuHandler,
	MenuItem,
	MenuList,
	Spinner,
	Tooltip,
	Typography
} from "@material-tailwind/react";
import React, {forwardRef, Fragment, useEffect, useMemo, useState} from "react";
import {
	ArrowPathIcon,
	ChevronDownIcon,
	EllipsisHorizontalIcon,
	GlobeAltIcon,
	QuestionMarkCircleIcon,
	UserCircleIcon
} from "@heroicons/react/24/solid";
import {HNavBar, VStack} from "@/components/layout";
import {
	environmentAddProjectWithPicker,
	environmentCheckProjectName,
	environmentCopyProjectForMigration,
	environmentCreateProject,
	environmentPickProjectDefaultPath,
	environmentProjectCreationInformation,
	environmentProjects,
	environmentRemoveProject,
	projectMigrateProjectToVpm,
	TauriProject,
	TauriProjectDirCheckResult,
	TauriProjectTemplate,
	TauriProjectType,
	utilOpen
} from "@/lib/bindings";
import {useQuery} from "@tanstack/react-query";
import {useRouter} from "next/navigation";
import {SearchBox} from "@/components/SearchBox";
import {unsupported} from "@/lib/unsupported";
import {openUnity} from "@/lib/open-unity";
import {toast} from "react-toastify";
import {toastThrownError} from "@/lib/toastThrownError";
import {nop} from "@/lib/nop";
import {useDebounce} from "@uidotdev/usehooks";
import {VGOption, VGSelect} from "@/components/select";

export default function Page() {
	const result = useQuery({
		queryKey: ["projects"],
		queryFn: environmentProjects,
	});

	const [search, setSearch] = useState("");
	const [loadingOther, setLoadingOther] = useState(false);
	const [createProjectState, setCreateProjectState] = useState<'normal' | 'creating'>('normal');

	const removeProject = async (project: TauriProject, directory: boolean) => {
		setLoadingOther(true);
		try {
			await environmentRemoveProject(project.list_version, project.index, directory);
			toast.success("Project removed successfully");
		} finally {
			setLoadingOther(false);
		}
		await result.refetch();
	};

	const startCreateProject = () => setCreateProjectState('creating');

	const loading = result.isFetching || loadingOther;

	return (
		<VStack className={"m-4"}>
			<ProjectViewHeader className={"flex-shrink-0"}
												 refresh={() => result.refetch()}
												 startCreateProject={startCreateProject}
												 isLoading={loading}
												 search={search} setSearch={setSearch}/>
			<main className="flex-shrink overflow-hidden flex">
				<Card className="w-full overflow-x-auto overflow-y-scroll">
					{
						result.status == "pending" ? "Loading..." :
							result.status == "error" ? "Error Loading projects: " + result.error.message :
								<ProjectsTable
									projects={result.data}
									sorting={"lastModified"}
									search={search}
									loading={loading}
									refresh={() => result.refetch()}
									removeProject={removeProject}/>
					}
				</Card>
				{createProjectState === "creating" &&
					<CreateProject close={() => setCreateProjectState("normal")} refetch={() => result.refetch()}/>}
			</main>
		</VStack>
	);
}

function ProjectsTable(
	{
		projects, sorting, search, removeProject, loading, refresh,
	}: {
		projects: TauriProject[],
		sorting: "lastModified",
		search?: string,
		loading?: boolean,
		removeProject?: (project: TauriProject, directory: boolean) => void,
		refresh?: () => void,
	}
) {
	const TABLE_HEAD = [
		"Name",
		"Type",
		"Unity",
		"Last Modified",
		"", // actions
	];

	const projectsShown = useMemo(() => {
		let searched = projects.filter(project => project.name.toLowerCase().includes(search?.toLowerCase() ?? ""));
		if (sorting === "lastModified") {
			searched.sort((a, b) => b.last_modified - a.last_modified);
		}
		return searched;
	}, [projects, sorting, search]);

	return (
		<table className="relative table-auto text-left">
			<thead>
			<tr>
				{TABLE_HEAD.map((head, index) => (
					<th key={index}
							className={`sticky top-0 z-10 border-b border-blue-gray-100 bg-blue-gray-50 p-2.5`}>
						<Typography variant="small" className="font-normal leading-none">{head}</Typography>
					</th>
				))}
			</tr>
			</thead>
			<tbody>
			{projectsShown.map((project) =>
				<ProjectRow key={project.path} project={project} loading={loading} refresh={refresh}
										removeProject={(x) => removeProject?.(project, x)}/>)}
			</tbody>
		</table>
	);
}

const ProjectDisplayType: Record<TauriProjectType, "Avatars" | "Worlds" | "Unknown"> = {
	"Unknown": "Unknown",
	"LegacySdk2": "Unknown",
	"LegacyWorlds": "Worlds",
	"LegacyAvatars": "Avatars",
	"UpmWorlds": "Worlds",
	"UpmAvatars": "Avatars",
	"UpmStarter": "Unknown",
	"Worlds": "Worlds",
	"Avatars": "Avatars",
	"VpmStarter": "Unknown",
}

const LegacyProjectTypes = ["LegacySdk2", "LegacyWorlds", "LegacyAvatars", "UpmWorlds", "UpmAvatars", "UpmStarter"];

const relativeTimeFormat = new Intl.RelativeTimeFormat("en", {style: 'short'});

function formatDateOffset(date: number) {
	const now = Date.now();
	const diff = now - date;

	const PER_SECOND = 1000;
	const PER_MINUTE = 60 * PER_SECOND;
	const PER_HOUR = 60 * PER_MINUTE;
	const PER_DAY = 24 * PER_HOUR;
	const PER_WEEK = 7 * PER_DAY;
	const PER_MONTH = 30 * PER_DAY;
	const PER_YEAR = 365 * PER_DAY;

	const diffAbs = Math.abs(diff);

	if (diffAbs < 1000) return "just now";
	if (diffAbs < PER_MINUTE) return relativeTimeFormat.format(Math.floor(diff / PER_SECOND), "second");
	if (diffAbs < PER_HOUR) return relativeTimeFormat.format(Math.floor(diff / PER_MINUTE), "minute");
	if (diffAbs < PER_DAY) return relativeTimeFormat.format(Math.floor(diff / PER_HOUR), "hour");
	if (diffAbs < PER_WEEK) return relativeTimeFormat.format(Math.floor(diff / PER_DAY), "day");
	if (diffAbs < PER_MONTH) return relativeTimeFormat.format(Math.floor(diff / PER_WEEK), "week");
	if (diffAbs < PER_YEAR) return relativeTimeFormat.format(Math.floor(diff / PER_MONTH), "month");

	return relativeTimeFormat.format(Math.floor(diff / PER_YEAR), "year");
}

type ProjectRowState = {
	type: 'normal',
} | {
	type: 'remove:confirm',
} | {
	type: 'migrateVpm:confirm',
} | {
	type: 'migrateVpm:copyingProject',
} | {
	type: 'migrateVpm:updating',
}

function ProjectRow(
	{
		project,
		removeProject,
		loading,
		refresh,
	}: {
		project: TauriProject;
		removeProject?: (directory: boolean) => void;
		loading?: boolean;
		refresh?: () => void;
	}
) {
	const router = useRouter();

	const [dialogStatus, setDialogStatus] = useState<ProjectRowState>({type: 'normal'});

	const cellClass = "p-2.5";
	const noGrowCellClass = `${cellClass} w-1`;
	const typeIconClass = `w-5 h-5`;

	const displayType = ProjectDisplayType[project.project_type] ?? "Unknown"
	const isLegacy = LegacyProjectTypes.includes(project.project_type);
	const lastModified = new Date(project.last_modified);
	const lastModifiedHumanReadable = `${lastModified.getFullYear().toString().padStart(4, '0')}-${(lastModified.getMonth() + 1).toString().padStart(2, '0')}-${lastModified.getDate().toString().padStart(2, '0')} ${lastModified.getHours().toString().padStart(2, "0")}:${lastModified.getMinutes().toString().padStart(2, "0")}:${lastModified.getSeconds().toString().padStart(2, "0")}`;

	const openProjectFolder = () => utilOpen(project.path);

	const startRemoveProject = () => setDialogStatus({type: 'remove:confirm'});

	const startMigrateVpm = () => setDialogStatus({type: 'migrateVpm:confirm'});
	const doMigrateVpm = async (inPlace: boolean) => {
		setDialogStatus({type: 'normal'});
		try {
			let migrateProjectPath;
			if (inPlace) {
				migrateProjectPath = project.path;
			} else {
				// copy
				setDialogStatus({type: "migrateVpm:copyingProject"});
				migrateProjectPath = await environmentCopyProjectForMigration(project.path);
			}
			setDialogStatus({type: "migrateVpm:updating"});
			await projectMigrateProjectToVpm(migrateProjectPath);
			setDialogStatus({type: "normal"});
			toast.success("Project migrated successfully");
			refresh?.();
		} catch (e) {
			console.error("Error migrating project", e);
			setDialogStatus({type: "normal"});
			toastThrownError(e);
		}

	}

	const removed = !project.is_exists;

	const MayTooltip = removed ? Tooltip : Fragment;

	const RowButton = forwardRef<HTMLButtonElement, React.ComponentProps<typeof Button>>(function RowButton(props, ref) {
		if (removed) {
			return <Tooltip content={"Project Folder does not exists"}>
				<Button {...props} className={`disabled:pointer-events-auto ${props.className}`} disabled ref={ref}/>
			</Tooltip>
		} else {
			return (
				<Button {...props} className={`disabled:pointer-events-auto ${props.className}`}
								disabled={loading || props.disabled} ref={ref}/>
			);
		}
	});

	let manageButton;

	switch (project.project_type) {
		case "LegacySdk2":
			manageButton =
				<Tooltip content={"Legacy SDK2 project cannot be migrated automatically. Please migrate to SDK3 first."}>
					<RowButton color={"light-green"} disabled>
						Migrate
					</RowButton>
				</Tooltip>
			break;
		case "LegacyWorlds":
		case "LegacyAvatars":
			manageButton = <RowButton color={"light-green"} onClick={startMigrateVpm}>Migrate</RowButton>
			break;
		case "UpmWorlds":
		case "UpmAvatars":
		case "UpmStarter":
			manageButton = <Tooltip content={"UPM-VCC projects are not supported"}>
				<RowButton color={"blue"} disabled>
					Manage
				</RowButton>
			</Tooltip>
			break;
		case "Unknown":
		case "Worlds":
		case "Avatars":
		case "VpmStarter":
			manageButton = <RowButton
				onClick={() => router.push(`/projects/manage?${new URLSearchParams({projectPath: project.path})}`)}
				color={"blue"}>
				Manage
			</RowButton>
			break;
	}

	let dialogContent: React.ReactNode = null;
	switch (dialogStatus.type) {
		case "remove:confirm":
			const removeProjectButton = (directory: boolean) => {
				setDialogStatus({type: 'normal'});
				removeProject?.(directory);
			}
			dialogContent = (
				<Dialog open handler={nop} className={'whitespace-normal'}>
					<DialogHeader>Remove Project</DialogHeader>
					<DialogBody>
						You're about to remove the project <strong>{project.name}</strong>. Are you sure?
					</DialogBody>
					<DialogFooter>
						<Button onClick={() => setDialogStatus({type: 'normal'})} className="mr-1">Cancel</Button>
						<Button onClick={() => removeProjectButton(false)} className="mr-1 px-2">
							Remove from the List
						</Button>
						<Button onClick={() => removeProjectButton(true)} color={"red"} className="px-2"
										disabled={!project.is_exists}>
							Remove the Directory
						</Button>
					</DialogFooter>
				</Dialog>
			);
			break;
		case "migrateVpm:confirm":
			dialogContent = (
				<Dialog open handler={nop} className={"whitespace-normal"}>
					<DialogHeader>VPM Migration</DialogHeader>
					<DialogBody>
						<Typography className={"text-red-700"}>
							Project migration is experimental in vrc-get.
						</Typography>
						<Typography className={"text-red-700"}>
							Please make backup of your project before migration.
						</Typography>
					</DialogBody>
					<DialogFooter>
						<Button onClick={() => setDialogStatus({type: "normal"})} className="mr-1">Cancel Migration</Button>
						<Button onClick={() => doMigrateVpm(false)} color={"red"} className="mr-1">Migrate a Copy</Button>
						<Button onClick={() => doMigrateVpm(true)} color={"red"}>Migrate in-place</Button>
					</DialogFooter>
				</Dialog>
			);
			break;
		case "migrateVpm:copyingProject":
			dialogContent = (
				<Dialog open handler={nop} className={"whitespace-normal"}>
					<DialogHeader>VPM Migration</DialogHeader>
					<DialogBody>
						<Typography>
							Copying project for migration...
						</Typography>
					</DialogBody>
				</Dialog>
			);
			break;
		case "migrateVpm:updating":
			dialogContent = (
				<Dialog open handler={nop} className={"whitespace-normal"}>
					<DialogHeader>VPM Migration</DialogHeader>
					<DialogBody>
						<Typography>
							Migrating project...
						</Typography>
					</DialogBody>
				</Dialog>
			);
			break;
	}

	return (
		<tr className={`even:bg-blue-gray-50/50 ${(removed || loading) ? 'opacity-50' : ''}`}>
			<td className={cellClass}>
				<MayTooltip content={"Project Folder does not exists"}>
					<div className="flex flex-col">
						<Typography className="font-normal">
							{project.name}
						</Typography>
						<Typography className="font-normal opacity-50 text-sm">
							{project.path}
						</Typography>
					</div>
				</MayTooltip>
			</td>
			<td className={`${cellClass} w-[8em]`}>
				<div className="flex flex-row gap-2">
					<div className="flex items-center">
						{displayType === "Avatars" ? <UserCircleIcon className={typeIconClass}/> :
							displayType === "Worlds" ? <GlobeAltIcon className={typeIconClass}/> :
								<QuestionMarkCircleIcon className={typeIconClass}/>}
					</div>
					<div className="flex flex-col justify-center">
						<Typography className="font-normal">
							{displayType}
						</Typography>
						{isLegacy && <Typography className="font-normal opacity-50 text-sm text-red-700">Legacy</Typography>}
					</div>
				</div>
			</td>
			<td className={noGrowCellClass}>
				<Typography className="font-normal">
					{project.unity}
				</Typography>
			</td>
			<td className={noGrowCellClass}>
				<Tooltip content={lastModifiedHumanReadable}>
					<time dateTime={lastModified.toISOString()}>
						<Typography as={"time"} className="font-normal">
							{formatDateOffset(project.last_modified)}
						</Typography>
					</time>
				</Tooltip>
			</td>
			<td className={noGrowCellClass}>
				<div className="flex flex-row gap-2 max-w-min">
					<RowButton onClick={() => openUnity(project.path)}>Open Unity</RowButton>
					{manageButton}
					<RowButton onClick={unsupported("Backup")} color={"green"}>Backup</RowButton>
					<Menu>
						<MenuHandler>
							<IconButton variant="text" color={"blue"}><EllipsisHorizontalIcon
								className={"size-5"}/></IconButton>
						</MenuHandler>
						<MenuList>
							<MenuItem onClick={openProjectFolder} disabled={removed || loading}>Open Project Folder</MenuItem>
							<MenuItem onClick={startRemoveProject} disabled={loading} className={'text-red-700 focus:text-red-700'}>
								Remove Project
							</MenuItem>
						</MenuList>
					</Menu>
				</div>
				{dialogContent}
			</td>
		</tr>
	)
}

function ProjectViewHeader({className, refresh, startCreateProject, isLoading, search, setSearch}: {
	className?: string,
	refresh?: () => void,
	startCreateProject?: () => void
	isLoading?: boolean,
	search: string,
	setSearch: (search: string) => void
}) {
	const addProject = async () => {
		try {
			const result = await environmentAddProjectWithPicker();
			switch (result) {
				case "NoFolderSelected":
					// no-op
					break;
				case "InvalidSelection":
					toast.error("Invalid folder selected as a project");
					break;
				case "Successful":
					toast.success("Project added successfully");
					refresh?.();
					break;
				default:
					let _: never = result;
			}
		} catch (e) {
			console.error("Error adding project", e);
			toastThrownError(e);
		}
	};

	return (
		<HNavBar className={className}>
			<Typography className="cursor-pointer py-1.5 font-bold flex-grow-0">
				Projects
			</Typography>

			<Tooltip content="Reflesh list of projects">
				<IconButton variant={"text"} onClick={() => refresh?.()} disabled={isLoading}>
					{isLoading ? <Spinner className="w-5 h-5"/> : <ArrowPathIcon className={"w-5 h-5"}/>}
				</IconButton>
			</Tooltip>

			<SearchBox className={"w-max flex-grow"} value={search} onChange={(e) => setSearch(e.target.value)}/>

			<Menu>
				<ButtonGroup>
					<Button className={"pl-4 pr-3"} onClick={startCreateProject}>Create New Project</Button>
					<MenuHandler className={"pl-2 pr-2"}>
						<Button>
							<ChevronDownIcon className={"w-4 h-4"}/>
						</Button>
					</MenuHandler>
				</ButtonGroup>
				<MenuList>
					<MenuItem onClick={addProject}>Add Existing Project</MenuItem>
				</MenuList>
			</Menu>
		</HNavBar>
	);
}

type CreateProjectstate = 'loadingInitialInformation' | 'enteringInformation' | 'creating';

function CreateProject(
	{
		close,
		refetch,
	}: {
		close?: () => void,
		refetch?: () => void,
	}
) {
	const [state, setState] = useState<CreateProjectstate>('loadingInitialInformation');
	const [projectNameCheckState, setProjectNameCheckState] = useState<'checking' | TauriProjectDirCheckResult>('Ok');

	const [templates, setTemplates] = useState<TauriProjectTemplate[]>([]);
	const [chosenTemplate, setChosenTemplate] = useState<TauriProjectTemplate>();
	const [projectName, setProjectName] = useState("New Project");
	const [projectLocation, setProjectLocation] = useState("");
	const projectNameDebounced = useDebounce(projectName, 500);

	useEffect(() => {
		(async () => {
			const information = await environmentProjectCreationInformation();
			setTemplates(information.templates);
			setChosenTemplate(information.templates[0]);
			setProjectLocation(information.default_path);
			setState('enteringInformation');
		})();
	}, []);

	useEffect(() => {
		let canceled = false;
		(async () => {
			try {
				setProjectNameCheckState('checking');
				const result = await environmentCheckProjectName(projectLocation, projectNameDebounced);
				if (canceled) return;
				setProjectNameCheckState(result);
			} catch (e) {
				console.error("Error checking project name", e);
				toastThrownError(e);
			}
		})()
		return () => {
			canceled = true;
		};
	}, [projectNameDebounced, projectLocation]);

	const selectProjectDefaultFolder = async () => {
		try {
			const result = await environmentPickProjectDefaultPath();
			switch (result.type) {
				case "NoFolderSelected":
					// no-op
					break;
				case "InvalidSelection":
					toast.error("Selected file is invalid as a Project Default Path");
					break;
				case "Successful":
					setProjectLocation(result.new_path);
					break;
				default:
					const _exhaustiveCheck: never = result;
			}
		} catch (e) {
			console.error(e);
			toastThrownError(e)
		}
	};

	const createProject = async () => {
		try {
			setState('creating');
			await environmentCreateProject(projectLocation, projectName, chosenTemplate!);
			toast.success("Project created successfully");
			close?.();
			refetch?.();
		} catch (e) {
			console.error(e);
			toastThrownError(e);
			close?.();
		}
	};

	const checking = projectNameDebounced != projectName || projectNameCheckState === "checking";

	let projectNameState: 'Ok' | 'warn' | 'err';
	let projectNameCheck;

	switch (projectNameCheckState) {
		case "Ok":
			projectNameCheck = "Project name is valid";
			projectNameState = "Ok";
			break;
		case "InvalidNameForFolderName":
			projectNameCheck = "Invalid Project Name";
			projectNameState = "err";
			break;
		case "MayCompatibilityProblem":
			projectNameCheck = "Using such a symbol may cause compatibility problem";
			projectNameState = "warn";
			break;
		case "WideChar":
			projectNameCheck = "Using mutlibyte characters may cause compatibility problem";
			projectNameState = "warn";
			break;
		case "AlreadyExists":
			projectNameCheck = "The folder already exists";
			projectNameState = "err";
			break;
		case "checking":
			projectNameCheck = <Spinner/>;
			projectNameState = "Ok";
			break;
		default:
			const _exhaustiveCheck: never = projectNameCheckState;
			projectNameState = "err";
	}
	if (checking) projectNameCheck = <Spinner/>

	let dialogBody;

	switch (state) {
		case "loadingInitialInformation":
			dialogBody = <Spinner/>;
			break;
		case "enteringInformation":
			dialogBody = <>
				<VStack>
					<div className={"flex gap-1"}>
						<div className={"flex items-center"}>
							<Typography as={"label"}>Template:</Typography>
						</div>
						<VGSelect menuClassName={"z-[19999]"} value={chosenTemplate?.name}
											onChange={value => setChosenTemplate(value)}>
							{templates.map(template =>
								<VGOption value={template} key={`${template.type}:${template.name}`}>{template.name}</VGOption>)}
						</VGSelect>
					</div>
					<Input label={"Project Name"} value={projectName} onChange={(e) => setProjectName(e.target.value)}/>
					<div className={"flex gap-1"}>
						<Input label={"Project Location"} value={projectLocation} disabled/>
						<Button className={"px-4"} onClick={selectProjectDefaultFolder}>Select Folder</Button>
					</div>
					<Typography variant={"small"} className={"whitespace-normal"}>
						Created project will be at <code>{projectLocation}/{projectName}</code>
					</Typography>
					<Typography variant={"small"} className={"whitespace-normal"}
											color={projectNameState == "Ok" ? 'green' : projectNameState == "warn" ? 'yellow' : 'red'}>
						{projectNameCheck}
					</Typography>
				</VStack>
			</>;
			break;
		case "creating":
			dialogBody = <>
				<Spinner/>
				<Typography>Creating project...</Typography>
			</>;
			break;
	}

	return <Dialog handler={nop} open>
		<DialogHeader>Create New Project</DialogHeader>
		<DialogBody>
			{dialogBody}
		</DialogBody>
		<DialogFooter>
			<div className={"flex gap-2"}>
				<Button onClick={close} disabled={state == "creating"}>Cancel</Button>
				<Button onClick={createProject} disabled={checking || projectNameState == "err"}>Create</Button>
			</div>
		</DialogFooter>
	</Dialog>;
}
