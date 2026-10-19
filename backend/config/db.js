import mongoose from "mongoose";

export const connectDB = async () => {
    const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/food-del";
    await mongoose.connect(uri).then(() => console.log("DB Connected"));
}
