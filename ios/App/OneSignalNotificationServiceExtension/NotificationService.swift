import UserNotifications

import OneSignalExtension

/// OneSignal's Notification Service Extension.
///
/// iOS hands every incoming push with `mutable-content: 1` to this extension
/// before displaying it. OneSignal uses that window to download rich media
/// (images, in-app assets), report confirmed delivery, and apply badge counts.
/// Without this target those three features silently do nothing — plain text
/// notifications still arrive, so the absence is easy to miss.
class NotificationService: UNNotificationServiceExtension {

    var contentHandler: ((UNNotificationContent) -> Void)?
    var receivedRequest: UNNotificationRequest!
    var bestAttemptContent: UNMutableNotificationContent?

    override func didReceive(
        _ request: UNNotificationRequest,
        withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
    ) {
        self.receivedRequest = request
        self.contentHandler = contentHandler
        self.bestAttemptContent = request.content.mutableCopy() as? UNMutableNotificationContent

        if let bestAttemptContent = bestAttemptContent {
            OneSignalExtension.didReceiveNotificationExtensionRequest(
                self.receivedRequest,
                with: bestAttemptContent,
                withContentHandler: self.contentHandler
            )
        }
    }

    override func serviceExtensionTimeWillExpire() {
        // iOS gives the extension ~30s. On expiry, hand back the best content
        // we have rather than letting the notification be dropped.
        if let contentHandler = contentHandler, let bestAttemptContent = bestAttemptContent {
            OneSignalExtension.serviceExtensionTimeWillExpireRequest(
                self.receivedRequest,
                with: bestAttemptContent
            )
            contentHandler(bestAttemptContent)
        }
    }
}
