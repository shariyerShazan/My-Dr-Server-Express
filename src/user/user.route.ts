import { Router } from "express";
import { UserController } from "./user.controller.js";
import { authMiddleware } from "../middlewares/auth.js";

export class UserRoutes {
  public router: Router;
  private userController: UserController;

  constructor() {
    this.router = Router();
    this.userController = new UserController();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Note: To pass req context properly, we use arrow functions or .bind()
    this.router.get("/me", authMiddleware, this.userController.getMe);
    this.router.get("/", authMiddleware, this.userController.getUsers);
    this.router.get("/:id", authMiddleware, this.userController.getUserById);
    this.router.post("/", authMiddleware, this.userController.createUser);
    this.router.put("/:id", authMiddleware, this.userController.updateUser);
    this.router.delete("/:id", authMiddleware, this.userController.deleteUser);
  }
}
