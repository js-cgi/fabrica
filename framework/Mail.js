import { mail } from "../config/mail.js";

export const Mail = {
    send({ to, subject, body, from }) {
        if (mail.driver === "none") {
            throw new Error("No mail driver configured. Set a driver in config/mail.js");
        }

        const config = mail[mail.driver];
        if (!config) {
            throw new Error("Unknown mail driver: " + mail.driver);
        }

        const sender = from || config.from;
        if (!sender) {
            throw new Error("No from address configured");
        }

        smtp.send({
            host: config.host,
            port: config.port,
            user: config.user,
            password: config.password,
            from: sender,
            to: to,
            subject: subject,
            body: body
        });
    }
};
