import WidgetKit
import SwiftUI
import ActivityKit // Added for Live Activities

@main
struct BacchusWidgetBundle: WidgetBundle {
    var body: some Widget {
        BacchusWidget()
        if #available(iOS 16.1, *) {
            BacchusLiveActivity()
        }
    }
}

// MARK: - Live Activity Widget (iOS 16.1+)
@available(iOS 16.1, *)
struct BacchusLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: BacchusActivityAttributes.self) { context in
            // Lock screen/banner UI
            BacchusLiveActivityView(context: context)
        } dynamicIsland: { context in
            // Dynamic Island UI
            BacchusLiveActivityDynamicIsland(context: context).body
        }
    }
}