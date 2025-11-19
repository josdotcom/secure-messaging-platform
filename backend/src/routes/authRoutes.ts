import { Router } from "express";
import { body } from "express-validator";
import authController from "../controllers/authController.js";
import { authenticate} from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validationMiddleware.js";

const router = Router();

const registerValidation = [
    body("email").isEmail().normalizeEmail().withMessage("Invalid email address"),
    body("username").isLength({ min: 3, max: 20 }).trim().withMessage("Username must be between 3 and 20 characters"),
    body("password").isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number')
];

const loginValidation = [
    body("email").isEmail().normalizeEmail().withMessage("Invalid email address"),
    body("password").notEmpty().withMessage("Password is required")
];

router.post("/register", registerValidation, validate, authController.register);
router.post("/login", loginValidation, validate, authController.login);
router.post("/refresh-token", authController.refreshToken);
router.post("/logout", authenticate, authController.logout);

export default router;