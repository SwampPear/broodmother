import type { BroodmotherConfig } from '../core'
import type { NewProject, ProjectSummary } from '../project'

export interface GetProjects {
  request: null
  response: { projects: ProjectSummary[] } // the open vault's, every one of them open
}

// Makes the folder if it is not there yet, then links it to a vault.
export interface PostProjects {
  request: NewProject
  response: { project: ProjectSummary; config: BroodmotherConfig }
}

export interface DeleteProjects {
  request: { name: string } // the link and the checkouts broodmother made; never the repository
  response: { config: BroodmotherConfig } // the scope falls back to the vault if it was here
}
