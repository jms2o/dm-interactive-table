import type { AuthPrincipal } from "../../../shared/types/auth";

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPrincipal;
    }
  }
}

export {};
