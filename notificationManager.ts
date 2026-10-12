import * as Notifications from 'expo-notifications';

/**
 * Helper function to safely cancel an active notification by its unique ID
 */
export async function cancelNotification(identifier: string) {
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch (error) {
    console.log(`No active notification found for ID: ${identifier}`);
  }
}

/**
 * RULE 1: Daily Chores at 7 PM for non-completed chores.
 */
export async function scheduleChoreReminder(choreId: string, choreTitle: string) {
  await cancelNotification(choreId);

  await Notifications.scheduleNotificationAsync({
    identifier: choreId,
    content: {
      title: "🧹 Pending Chore Reminder",
      body: `Don't forget to finish: ${choreTitle}`,
      sound: true,
      data: { type: 'chore', choreId },
    },
    trigger: {
      hour: 19,
      minute: 0,
      repeats: true,
    } as Notifications.NotificationTriggerInput,
  });
}

/**
 * RULE 2: 1 Day before an event/task AND 1 hour before.
 */
export async function scheduleEventReminders(eventId: string, eventTitle: string, eventDate: Date) {
  const uniqueId1Day = `${eventId}-1day`;
  const uniqueId1Hour = `${eventId}-1hour`;

  await cancelNotification(uniqueId1Day);
  await cancelNotification(uniqueId1Hour);

  const now = new Date();
  const oneDayBefore = new Date(eventDate.getTime() - 24 * 60 * 60 * 1000);
  const oneHourBefore = new Date(eventDate.getTime() - 60 * 60 * 1000);

  // Schedule 1 Day Alert
  if (oneDayBefore > now) {
    await Notifications.scheduleNotificationAsync({
      identifier: uniqueId1Day,
      content: {
        title: "📅 Upcoming Event Tomorrow",
        body: `"${eventTitle}" is scheduled for tomorrow.`,
        sound: true,
        data: { type: 'event', eventId },
      },
      trigger: { 
        type: 'date', 
        date: oneDayBefore 
      } as Notifications.NotificationTriggerInput,
    });
  }

  // Schedule 1 Hour Alert
  if (oneHourBefore > now) {
    await Notifications.scheduleNotificationAsync({
      identifier: uniqueId1Hour,
      content: {
        title: "⏰ Event Starting Soon",
        body: `"${eventTitle}" starts in 1 hour.`,
        sound: true,
        data: { type: 'event', eventId },
      },
      trigger: { 
        type: 'date', 
        date: oneHourBefore 
      } as Notifications.NotificationTriggerInput,
    });
  }
}

/**
 * RULE 3: 1 Day before predicted period.
 */
export async function schedulePredictedPeriodReminder(predictionId: string, predictedStartDate: Date) {
  const uniqueId = `period-${predictionId}`;
  await cancelNotification(uniqueId);

  const now = new Date();
  const oneDayBefore = new Date(predictedStartDate.getTime() - 24 * 60 * 60 * 1000);

  if (oneDayBefore > now) {
    await Notifications.scheduleNotificationAsync({
      identifier: uniqueId,
      content: {
        title: "🌸 Period Prediction",
        body: "Your predicted period is expected to start tomorrow.",
        sound: true,
        data: { type: 'prediction', predictionId },
      },
      trigger: { 
        type: 'date', 
        date: oneDayBefore 
      } as Notifications.NotificationTriggerInput,
    });
  }
}