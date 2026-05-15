import { Router, type IRouter } from "express";
import healthRouter from "./health";
import problemsRouter from "./problems";
import submissionsRouter from "./submissions";
import usersRouter from "./users";
import statsRouter from "./stats";
import discussionsRouter from "./discussions";
import articlesRouter from "./articles";

const router: IRouter = Router();

router.use(healthRouter);
router.use(problemsRouter);
router.use(submissionsRouter);
router.use(usersRouter);
router.use(statsRouter);
router.use(discussionsRouter);
router.use(articlesRouter);

export default router;
