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

        if (mail.driver === "smtp") {
            sendSmtp(config, sender, to, subject, body);
        } else if (mail.driver === "ses") {
            sendSes(config, sender, to, subject, body);
        } else {
            throw new Error("Unknown mail driver: " + mail.driver);
        }
    }
};

function sendSmtp(config, from, to, subject, body) {
    smtp.send({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        from: from,
        to: to,
        subject: subject,
        body: body
    });
}

function sendSes(config, from, to, subject, body) {
    const region = config.region;
    const accessKey = config.key;
    const secretKey = config.secret;
    const host = "email." + region + ".amazonaws.com";

    const params = "Action=SendEmail" +
        "&Source=" + encodeURIComponent(from) +
        "&Destination.ToAddresses.member.1=" + encodeURIComponent(to) +
        "&Message.Subject.Data=" + encodeURIComponent(subject) +
        "&Message.Body.Text.Data=" + encodeURIComponent(body);

    const now = new Date();
    const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
    const dateStamp = amzDate.substring(0, 8);
    const contentType = "application/x-www-form-urlencoded";

    const canonicalHeaders =
        "content-type:" + contentType + "\n" +
        "host:" + host + "\n" +
        "x-amz-date:" + amzDate + "\n";
    const signedHeaders = "content-type;host;x-amz-date";

    const payloadHash = crypto.sha256(params);

    const canonicalRequest =
        "POST\n" +
        "/\n" +
        "\n" +
        canonicalHeaders + "\n" +
        signedHeaders + "\n" +
        payloadHash;

    const credentialScope = dateStamp + "/" + region + "/ses/aws4_request";
    const stringToSign =
        "AWS4-HMAC-SHA256\n" +
        amzDate + "\n" +
        credentialScope + "\n" +
        crypto.sha256(canonicalRequest);

    const kDate = crypto.hmac("sha256", "AWS4" + secretKey, dateStamp);
    const kRegion = crypto.hmacHex("sha256", kDate, region);
    const kService = crypto.hmacHex("sha256", kRegion, "ses");
    const kSigning = crypto.hmacHex("sha256", kService, "aws4_request");
    const signature = crypto.hmacHex("sha256", kSigning, stringToSign);

    const authHeader = "AWS4-HMAC-SHA256 Credential=" + accessKey + "/" + credentialScope +
        ", SignedHeaders=" + signedHeaders +
        ", Signature=" + signature;

    const res = http.post("https://" + host + "/", params, {
        "Content-Type": contentType,
        "X-Amz-Date": amzDate,
        "Authorization": authHeader,
        "Expect": ""
    });

    if (res.status !== 200) {
        throw new Error("SES send failed (HTTP " + res.status + "): " + res.body);
    }
}

