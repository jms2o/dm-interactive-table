import { prisma } from "../persistence";
import { AuthService } from "./auth.service";
import {
  LocalIdentityRepository,
  PrismaIdentityRepository,
} from "./identity.repository";

export const identityRepository = prisma
  ? new PrismaIdentityRepository(prisma)
  : new LocalIdentityRepository();

export const authService = new AuthService(identityRepository);
