import mongoose from "mongoose";

export async function connect (){
    try{
        // Avoid reconnecting if already connected/connecting
        if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) return;

        const uri = process.env.MONGO_URI;
        if (!uri || uri.trim().length === 0) {
            throw new Error("Missing MONGO_URI. Add it to your .env.local and restart the server.");
        }

        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 15000,
            connectTimeoutMS: 15000,
        } as any);

        const connection = mongoose.connection;
        connection.on("connected", () => {
            // connected
        });
        connection.on("error", (err) => {
            console.error("MongoDB connection error:", err);
        });
    }
    catch(error){
        console.error("Database connection error:", error);
        throw error;
    }
}