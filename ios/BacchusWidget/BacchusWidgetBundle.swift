//
//  BacchusWidgetBundle.swift
//  BacchusWidget
//
//  Created by Domenico Di Maio on 01/09/25.
//

import WidgetKit
import SwiftUI

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
            BacchusLiveActivityDynamicIsland(context: context)
        }
    }
}
