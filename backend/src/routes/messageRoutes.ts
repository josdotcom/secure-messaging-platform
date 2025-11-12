import { Router } from "express";
import messageController from "../controllers/messageController.js";
import { body } from "express-validator";
import { authenticate } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validationMiddleware.js";

const router = Router();

router.use(authenticate);

const messageValidation = [
    body("content")
    .trim()
    .notEmpty()
    .withMessage("Content is required")
    .isLength({ max: 2000 })
    .withMessage("Content must not exceed 2000 characters"),
    body("type")
    .isIn(["private", "group", "team"])
    .withMessage("Type must be one of: private, group, team"),
];

router.post("/", messageValidation, validate, messageController.createMessage);
router.get("/conversation/:partnerId", messageController.getConversation);
router.put('/:messageId/read', messageController.markAsRead);
router.delete('/:messageId', messageController.deleteMessage);
router.get('/search', messageController.searchMessages);

export default router;