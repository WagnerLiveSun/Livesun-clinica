type NotificationInput = { title: string; content: string };

export async function notifyOwner(_input: NotificationInput) {
  return false;
}
