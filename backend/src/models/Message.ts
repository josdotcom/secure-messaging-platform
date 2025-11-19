import mongoose, { Document, Schema } from "mongoose";

const AttachmentSchema = new Schema({
    url: { type: String, required: true },
    filename: { type: String, required: true },
    type: { type: String, required: true },
    Size: { type: Number, required: true }
}, { _id: false });

export interface IMessage extends Document {
    _id: mongoose.Types.ObjectId;
    senderId: mongoose.Types.ObjectId;
    recipientId?: mongoose.Types.ObjectId;
    groupId?: mongoose.Types.ObjectId;
    content: string;
    type: 'private' | 'group' | 'team';
    attachments?: Array<{
        url: string;
        filename: string;
        type: string;
        Size: number;
    }>;
    isRead: boolean;
    readAt?: Date;
    isSpam: boolean;
    isPinned: boolean;
    editedAt?: Date;
    deletedAt?: Date;
    createdAt: Date;
}

const MessageSchema = new Schema<IMessage>({
    senderId: { 
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    recipientId: { 
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: function(this: IMessage) {
            return this.type === 'private';
        }
    },
    groupId: {
        type: Schema.Types.ObjectId,
        ref: 'Group',
        required: function(this: IMessage) {
            return this.type === 'group' || this.type === 'team';
        }
    },
    content: {
        type: String,
        required: [true, 'Message content is required'],
        maxlength: [2000, 'Message content cannot exceed 2000 characters']
    },
    type: {
        type: String,
        enum: ['private', 'group', 'team'],
        required: true
    },
    attachments: [AttachmentSchema],
    isRead: {
        type: Boolean,
        default: false
    },
    readAt: Date,
    isSpam: {
        type: Boolean,
        default: false
    },
    isPinned: {
        type: Boolean,
        default: false
    },
    editedAt: Date,
    deletedAt: Date
}, {    timestamps: true
});

MessageSchema.index({ senderId: 1, createdAt: -1 });
MessageSchema.index({ recipientId: 1, createdAt: -1 });
MessageSchema.index({ GroupId: 1, createdAt: -1 });
MessageSchema.index({ content: 'text'});

export const Message = mongoose.model<IMessage>('Message', MessageSchema);