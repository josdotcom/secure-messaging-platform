import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcrypt';

export interface IUser extends Document {
    _id: mongoose.Types.ObjectId;
    email: string;
    username: string;
    passwordHash: string;
    role: 'user' | 'moderator' | 'admin';
    profilePictureUrl?: string;
    bio?: string;
    isOnline: boolean;
    lastActiveAt: Date;
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema= new Schema<IUser>({
    email: { 
        type: String,
        required: [true, 'Email is required'],
        lowercase: true,
        trim: true,
        match: [/.+\@.+\..+/, 'Please fill a valid email address']
    },
    username: { 
        type: String,
        required: [true, 'Username is required'],
        trim: true,
        minlength: [3, 'Username must be at least 3 characters long'],
        maxlength: [30, 'Username cannot exceed 30 characters']
    },
    passwordHash: { 
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password hash must be at least 8 characters long']
    },
    role: { 
        type: String,
        enum: ['user', 'moderator', 'admin'],
        default: 'user'
    },
    profilePictureUrl: String,
    bio: { 
        type: String,
        maxlength: [500, 'Bio cannot exceed 500 characters']
    },
    isOnline: { 
        type: Boolean,
        default: false
    },
    lastActiveAt: { 
        type: Date,
        default: Date.now
    }
}, {   
    timestamps: true
});

UserSchema.pre('save', async function(next) {
    if (!this.isModified('passwordHash')) {
        return next();
    }

    try {
        const salt = await bcrypt.genSalt(10);
        this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
        next();
    }
    catch (err) {
        next(err as Error);
    }
});

UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.passwordHash);
}

UserSchema.index({ email: 1 });
UserSchema.index({ username: 1 });

export const User = mongoose.model<IUser>('User', UserSchema);