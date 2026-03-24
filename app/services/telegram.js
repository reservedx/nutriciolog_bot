import fetch from "node-fetch";

export async function getTelegramFileUrl(botToken, fileId) {
  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`
  );

  if (!response.ok) {
    throw new Error(`Telegram getFile failed with status ${response.status}`);
  }

  const payload = await response.json();

  if (!payload.ok || !payload.result?.file_path) {
    throw new Error("Telegram did not return a file_path for the provided file_id");
  }

  return `https://api.telegram.org/file/bot${botToken}/${payload.result.file_path}`;
}
