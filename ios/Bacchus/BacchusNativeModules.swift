import Foundation
import WidgetKit
import ActivityKit
import React

// MARK: - Widget Native Module
@objc(BacchusNativeModules)
class BacchusNativeModules: NSObject {
    
    @objc
    static func requiresMainQueueSetup() -> Bool {
        return false
    }
    
    // MARK: - Widget Methods
    @objc
    func updateWidget(_ data: NSDictionary, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        print("🔵 updateWidget called with data: \(data)")
        
        guard let userDefaults = UserDefaults(suiteName: "group.com.bacchusapp.app.widget") else {
            print("❌ Cannot access app group: group.com.bacchusapp.app.widget")
            reject("WIDGET_ERROR", "Cannot access app group", nil)
            return
        }
        
        let currentBAC = data["currentBAC"] as? Double ?? 0.0
        let sessionActive = data["sessionActive"] as? Bool ?? false
        let userName = data["userName"] as? String ?? "User"
        let timeToSober = data["timeToSober"] as? String ?? "0min"
        
        let widgetData = [
            "currentBAC": currentBAC,
            "sessionActive": sessionActive,
            "userName": userName,
            "timeToSober": timeToSober
        ]
        
        print("📊 Widget data to save: BAC=\(currentBAC), Active=\(sessionActive), User=\(userName), Time=\(timeToSober)")
        
        do {
            let jsonData = try JSONSerialization.data(withJSONObject: widgetData)
            userDefaults.set(jsonData, forKey: "BacchusWidgetData")
            userDefaults.synchronize() // Force sync
            
            // Richiedi aggiornamento widget
            WidgetCenter.shared.reloadAllTimelines()
            
            print("✅ Widget data updated successfully: BAC \(currentBAC)")
            resolve(true)
        } catch {
            print("❌ Widget data encoding error: \(error)")
            reject("WIDGET_ERROR", "Failed to update widget data", error)
        }
    }
    
    @objc
    func clearWidget(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        guard let userDefaults = UserDefaults(suiteName: "group.com.bacchusapp.app.widget") else {
            reject("WIDGET_ERROR", "Cannot access app group", nil)
            return
        }
        
        userDefaults.removeObject(forKey: "BacchusWidgetData")
        WidgetCenter.shared.reloadAllTimelines()
        
        print("🗑️ Widget data cleared")
        resolve(true)
    }
    
    // MARK: - Live Activity Methods
    @objc
    func startLiveActivity(_ data: NSDictionary, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        
        if #available(iOS 16.1, *) {
            let attributes = BacchusActivityAttributes(
                userName: data["userName"] as? String ?? "User"
            )
            
            let contentState = BacchusActivityAttributes.ContentState(
                currentBAC: data["currentBAC"] as? Double ?? 0.0,
                timeToSober: data["timeToSober"] as? String ?? "0min",
                targetBAC: data["targetBAC"] as? Double ?? 0.0,
                lastUpdated: Date()
            )
            
            do {
                let activity = try Activity<BacchusActivityAttributes>.request(
                    attributes: attributes,
                    content: .init(state: contentState, staleDate: nil),
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
    func updateLiveActivity(_ data: NSDictionary, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        if #available(iOS 16.1, *) {
            let contentState = BacchusActivityAttributes.ContentState(
                currentBAC: data["currentBAC"] as? Double ?? 0.0,
                timeToSober: data["timeToSober"] as? String ?? "0min",
                targetBAC: data["targetBAC"] as? Double ?? 0.0,
                lastUpdated: Date()
            )
            
            Task {
                for activity in Activity<BacchusActivityAttributes>.activities {
                    await activity.update(.init(state: contentState, staleDate: nil))
                    print("✅ Live Activity updated: BAC \(contentState.currentBAC)")
                    break
                }
                resolve(true)
            }
        } else {
            reject("LIVE_ACTIVITY_UNAVAILABLE", "Live Activities require iOS 16.1+", nil)
        }
    }
    
    @objc
    func endLiveActivity(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        if #available(iOS 16.1, *) {
            Task {
                for activity in Activity<BacchusActivityAttributes>.activities {
                    await activity.end(nil, dismissalPolicy: .immediate)
                    print("⏹️ Live Activity ended")
                    break
                }
                resolve(true)
            }
        } else {
            reject("LIVE_ACTIVITY_UNAVAILABLE", "Live Activities require iOS 16.1+", nil)
        }
    }
}
