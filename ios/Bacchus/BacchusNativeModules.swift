import Foundation
import React
import WidgetKit
import ActivityKit

// MARK: - Widget Native Module
@objc(BacchusWidgetModule)
class BacchusWidgetModule: NSObject {
    
    @objc
    static func requiresMainQueueSetup() -> Bool {
        return false
    }
    
    @objc
    func updateWidget(_ data: NSDictionary) {
        guard let userDefaults = UserDefaults(suiteName: "group.com.bacchusapp.app.widget") else {
            print("❌ Widget: Cannot access app group")
            return
        }
        
        let widgetData = [
            "currentBAC": data["currentBAC"] as? Double ?? 0.0,
            "sessionActive": data["sessionActive"] as? Bool ?? false,
            "userName": data["userName"] as? String ?? "User",
            "timeToSober": data["timeToSober"] as? String ?? "0min"
        ]
        
        do {
            let jsonData = try JSONSerialization.data(withJSONObject: widgetData)
            userDefaults.set(jsonData, forKey: "BacchusWidgetData")
            
            // Richiedi aggiornamento widget
            WidgetCenter.shared.reloadAllTimelines()
            
            print("✅ Widget data updated successfully")
        } catch {
            print("❌ Widget data encoding error: \(error)")
        }
    }
    
    @objc
    func clearWidgets() {
        guard let userDefaults = UserDefaults(suiteName: "group.com.bacchusapp.app.widget") else {
            return
        }
        
        userDefaults.removeObject(forKey: "BacchusWidgetData")
        WidgetCenter.shared.reloadAllTimelines()
        
        print("🗑️ Widget data cleared")
    }
}

// MARK: - Live Activity Native Module
@objc(BacchusLiveActivityModule)
class BacchusLiveActivityModule: NSObject {
    
    @objc
    static func requiresMainQueueSetup() -> Bool {
        return false
    }
    
    @objc
    func startActivity(_ data: NSDictionary, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        
        if #available(iOS 16.1, *) {
            let attributes = BacchusActivityAttributes(
                sessionId: data["sessionId"] as? String ?? UUID().uuidString,
                userName: data["userName"] as? String ?? "User"
            )
            
            let contentState = BacchusActivityAttributes.ContentState(
                currentBAC: data["currentBAC"] as? Double ?? 0.0,
                targetBAC: data["targetBAC"] as? Double ?? 0.0,
                timeToTarget: data["timeToTarget"] as? String ?? "0min",
                lastUpdated: Date()
            )
            
            do {
                let activity = try Activity<BacchusActivityAttributes>.request(
                    attributes: attributes,
                    contentState: contentState,
                    pushType: nil
                )
                
                print("✅ Live Activity started: \(activity.id)")
                resolve(activity.id)
                
            } catch {
                print("❌ Live Activity start error: \(error)")
                reject("LIVE_ACTIVITY_ERROR", "Failed to start Live Activity", error)
            }
        } else {
            reject("LIVE_ACTIVITY_UNAVAILABLE", "Live Activities require iOS 16.1+", nil)
        }
    }
    
    @objc
    func updateActivity(_ activityId: String, data: NSDictionary) {
        if #available(iOS 16.1, *) {
            let contentState = BacchusActivityAttributes.ContentState(
                currentBAC: data["currentBAC"] as? Double ?? 0.0,
                targetBAC: data["targetBAC"] as? Double ?? 0.0,
                timeToTarget: data["timeToTarget"] as? String ?? "0min",
                lastUpdated: Date()
            )
            
            Task {
                for activity in Activity<BacchusActivityAttributes>.activities {
                    if activity.id == activityId {
                        await activity.update(using: contentState)
                        print("✅ Live Activity updated: \(activityId)")
                        break
                    }
                }
            }
        }
    }
    
    @objc
    func endActivity(_ activityId: String) {
        if #available(iOS 16.1, *) {
            Task {
                for activity in Activity<BacchusActivityAttributes>.activities {
                    if activity.id == activityId {
                        await activity.end(dismissalPolicy: .immediate)
                        print("⏹️ Live Activity ended: \(activityId)")
                        break
                    }
                }
            }
        }
    }
}
