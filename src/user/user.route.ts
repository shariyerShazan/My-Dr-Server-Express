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
    /**
     * @openapi
     * /api/users/me:
     *   get:
     *     tags: [Users]
     *     summary: Get current authenticated user
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Current user profile
     * /api/users:
     *   get:
     *     tags: [Users]
     *     summary: Get all users
     *     security:
     *       - bearerAuth: []
     *   post:
     *     tags: [Users]
     *     summary: Create a user
     * /api/users/{id}:
     *   get:
     *     tags: [Users]
     *     summary: Get a user by ID
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *   put:
     *     tags: [Users]
     *     summary: Update a user
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *   delete:
     *     tags: [Users]
     *     summary: Delete a user
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     */
    this.router.get("/me", authMiddleware, this.userController.getMe);
    this.router.get("/", authMiddleware, this.userController.getUsers);
    this.router.get("/:id", authMiddleware, this.userController.getUserById);
    this.router.post("/", authMiddleware, this.userController.createUser);
    this.router.put("/:id", authMiddleware, this.userController.updateUser);
    this.router.delete("/:id", authMiddleware, this.userController.deleteUser);
  }
}
