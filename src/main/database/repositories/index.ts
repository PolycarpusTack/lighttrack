export { BaseRepository } from './BaseRepository';
export { ActivityRepository } from './ActivityRepository';
export { ProjectRepository } from './ProjectRepository';
export { TagRepository } from './TagRepository';
export { SettingRepository } from './SettingRepository';

// Repository instances (singleton pattern)
import { ActivityRepository } from './ActivityRepository';
import { ProjectRepository } from './ProjectRepository';
import { TagRepository } from './TagRepository';
import { SettingRepository } from './SettingRepository';

let activityRepository: ActivityRepository;
let projectRepository: ProjectRepository;
let tagRepository: TagRepository;
let settingRepository: SettingRepository;

export function getActivityRepository(): ActivityRepository {
  if (!activityRepository) {
    activityRepository = new ActivityRepository();
  }
  return activityRepository;
}

export function getProjectRepository(): ProjectRepository {
  if (!projectRepository) {
    projectRepository = new ProjectRepository();
  }
  return projectRepository;
}

export function getTagRepository(): TagRepository {
  if (!tagRepository) {
    tagRepository = new TagRepository();
  }
  return tagRepository;
}

export function getSettingRepository(): SettingRepository {
  if (!settingRepository) {
    settingRepository = new SettingRepository();
  }
  return settingRepository;
}