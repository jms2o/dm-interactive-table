import { Router } from "express";
import { demoService } from "../modules/demo/demo.service";

export const demoRouter = Router();

demoRouter.get("/readiness", (_request, response) => {
  response.status(200).json(demoService.getReadiness());
});
