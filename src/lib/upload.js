// Dish photo uploads. VITE_UPLOAD_PROVIDER picks how admins add images:
//   cloudinary: upload from the device to a Cloudinary *unsigned* preset (no secret in the browser)
//   url:        paste a link to an image that is already online
// Without Cloudinary settings the app falls back to "url".
const env = import.meta.env;
const cloudName = env.VITE_CLOUDINARY_CLOUD_NAME;
const preset = env.VITE_CLOUDINARY_UPLOAD_PRESET;
const folder = env.VITE_CLOUDINARY_FOLDER || "zaika";

export const UPLOAD_PROVIDER = env.VITE_UPLOAD_PROVIDER === "url" || !cloudName || !preset ? "url" : "cloudinary";

export const MAX_UPLOAD_MB = 5;

export const uploadImage = (file, onProgress) =>
    new Promise((resolve, reject) => {
        if (UPLOAD_PROVIDER !== "cloudinary") return reject(new Error("Uploads are not configured. Paste an image URL instead."));
        if (!file.type.startsWith("image/")) return reject(new Error("Please choose an image file (JPG, PNG or WebP)."));
        if (file.size > MAX_UPLOAD_MB * 1024 * 1024) return reject(new Error(`That image is over ${MAX_UPLOAD_MB} MB. Please pick a smaller one.`));

        const body = new FormData();
        body.append("file", file);
        body.append("upload_preset", preset);
        body.append("folder", folder);

        // XHR rather than fetch so we can report upload progress
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);
        xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
        xhr.onload = () => {
            let data = {};
            try {
                data = JSON.parse(xhr.responseText);
            } catch {
                // fall through to the generic error
            }
            if (xhr.status >= 200 && xhr.status < 300 && data.secure_url) return resolve(data.secure_url);
            const message = data.error?.message || "Upload failed.";
            reject(new Error(/preset/i.test(message) ? `Cloudinary: ${message}. Create the unsigned preset "${preset}" (see README).` : message));
        };
        xhr.onerror = () => reject(new Error("Upload failed. Check your connection and try again."));
        xhr.send(body);
    });

// Asks the image host for a right-sized, modern-format version when it supports it
export const optimizedImage = (url, width = 640) => {
    if (!url) return url;
    if (url.includes("res.cloudinary.com") && url.includes("/upload/") && !url.includes("/upload/f_auto")) {
        return url.replace("/upload/", `/upload/f_auto,q_auto,c_fill,w_${width}/`);
    }
    if (url.includes("images.unsplash.com")) {
        const u = new URL(url);
        u.searchParams.set("w", String(width));
        u.searchParams.set("q", "75");
        u.searchParams.set("auto", "format");
        u.searchParams.set("fit", "crop");
        return u.toString();
    }
    return url;
};
