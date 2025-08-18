import Foundation
import React
import ActivityKit
import WidgetKit

// MARK: - BAC Live Activity Module
@objc(BACLiveActivity)
class BACLiveActivity: NSObject, RCTBridgeModule {
    static func moduleName() -> String! {
        return "BACLiveActivity"
    }
    
    static func requiresMainQueueSetup() -> Bool {
        return false
    }
    
    // MARK: - Start Activity
    @objc(startActivity:resolver:rejecter:)
    func startActivity(
        data: [String: Any],
        resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        guard #available(iOS 16.1, *) else {
            rejecter("UNSUPPORTED", "Live Activities require iOS 16.1+", nil)
            return
        }
        
        do {
            let attributes = BacchusActivityAttributes(
                activityId: UUID().uuidString,
                startTime: Date()
            )
            
            let contentState = try createContentState(from: data)
            
            let activity = try Activity<BacchusActivityAttributes>.request(
                attributes: attributes,
                contentState: contentState,
                pushType: nil
            )
            
            // Store activity ID for updates
            UserDefaults.standard.set(activity.id, forKey: "BacchusLiveActivityID")
            
            resolver(activity.id)
        } catch {
            rejecter("START_ERROR", "Failed to start Live Activity: \(error.localizedDescription)", error)
        }
    }
    
    // MARK: - Update Activity
    @objc(updateActivity:data:resolver:rejecter:)
    func updateActivity(
        activityId: String,
        data: [String: Any],
        resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        guard #available(iOS 16.1, *) else {
            rejecter("UNSUPPORTED", "Live Activities require iOS 16.1+", nil)
            return
        }
        
        do {
            let contentState = try createContentState(from: data)
            
            Task {
                for activity in Activity<BacchusActivityAttributes>.activities {
                    if activity.id == activityId {
                        await activity.update(using: contentState)
                        break
                    }
                }
            }
            
            resolver(nil)
        } catch {
            rejecter("UPDATE_ERROR", "Failed to update Live Activity: \(error.localizedDescription)", error)
        }
    }
    
    // MARK: - End Activity
    @objc(endActivity:resolver:rejecter:)
    func endActivity(
        activityId: String,
        resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        guard #available(iOS 16.1, *) else {
            rejecter("UNSUPPORTED", "Live Activities require iOS 16.1+", nil)
            return
        }
        
        Task {
            for activity in Activity<BacchusActivityAttributes>.activities {
                if activity.id == activityId {
                    await activity.end(dismissalPolicy: .immediate)
                    break
                }
            }
        }
        
        // Remove stored activity ID
        UserDefaults.standard.removeObject(forKey: "BacchusLiveActivityID")
        
        resolver(nil)
    }
    
    // MARK: - Helper Methods
    private func createContentState(from data: [String: Any]) throws -> BacchusActivityAttributes.ContentState {
        guard let lockScreenData = data["lockScreenData"] as? [String: Any],
              let content = lockScreenData["content"] as? [String: Any] else {
            throw NSError(domain: "BACLiveActivity", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid data structure"])
        }
        
        let currentBAC = content["currentBAC"] as? Double ?? 0.0
        let targetBAC = content["targetBAC"] as? Double ?? 0.0
        let targetDescription = content["targetDescription"] as? String ?? ""
        let timeRemaining = content["timeRemaining"] as? String ?? ""
        let progressPercentage = content["progressPercentage"] as? Double ?? 0.0
        let isAboveLegalLimit = content["status"] as? String == "ABOVE_LIMIT"
        let lastUpdated = content["lastUpdated"] as? String ?? ""
        
        // Extract user profile
        let subtitle = lockScreenData["subtitle"] as? String ?? "👤 User"
        let parts = subtitle.components(separatedBy: " ")
        let emoji = parts.first ?? "👤"
        let name = parts.dropFirst().joined(separator: " ")
        
        let userProfile = ActivityUserProfile(
            name: name.isEmpty ? "User" : name,
            emoji: emoji,
            color: "#FF5252"
        )
        
        return BacchusActivityAttributes.ContentState(
            currentBAC: currentBAC,
            targetBAC: targetBAC,
            targetDescription: targetDescription,
            timeRemaining: timeRemaining,
            progressPercentage: progressPercentage,
            isAboveLegalLimit: isAboveLegalLimit,
            userProfile: userProfile,
            lastUpdated: lastUpdated,
            timestamp: Date().timeIntervalSince1970
        )
    }
}

// MARK: - BAC Widget Module
@objc(BACWidget)
class BACWidget: NSObject, RCTBridgeModule {
    static func moduleName() -> String! {
        return "BACWidget"
    }
    
    static func requiresMainQueueSetup() -> Bool {
        return false
    }
    
    // MARK: - Update Widget
    @objc(updateWidget:resolver:rejecter:)
    func updateWidget(
        data: [String: Any],
        resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        // Save data to UserDefaults for widget to read
        let userDefaults = UserDefaults(suiteName: "group.com.bacchusapp.app.widget")
        
        do {
            let jsonData = try JSONSerialization.data(withJSONObject: data, options: [])
            userDefaults?.set(jsonData, forKey: "BACWidgetData")
            
            // Reload widget timelines
            WidgetCenter.shared.reloadAllTimelines()
            
            resolver(nil)
        } catch {
            rejecter("UPDATE_ERROR", "Failed to update widget: \(error.localizedDescription)", error)
        }
    }
    
    // MARK: - Reload All Timelines
    @objc(reloadAllTimelines:rejecter:)
    func reloadAllTimelines(
        resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        WidgetCenter.shared.reloadAllTimelines()
        resolver(nil)
    }
}

// MARK: - Extensions for Codable conformance
extension BACWidgetData: Codable {
    enum CodingKeys: String, CodingKey {
        case currentBAC, targetBAC, targetDescription, timeRemaining
        case progressPercentage, status, userProfile, lastUpdated
    }
}

struct BACWidgetUserProfile: Codable {
    let name: String
    let emoji: String
    let color: String
}

struct BACWidgetData: Codable {
    let currentBAC: Double
    let targetBAC: Double
    let targetDescription: String
    let timeRemaining: String
    let progressPercentage: Double
    let status: String
    let userProfile: BACWidgetUserProfile
    let lastUpdated: String
}
