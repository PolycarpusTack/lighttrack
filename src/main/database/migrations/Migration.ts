import { MigrationInterface, QueryRunner } from 'typeorm';

export interface Migration extends MigrationInterface {
  version: number;
  name: string;
  description?: string;
}