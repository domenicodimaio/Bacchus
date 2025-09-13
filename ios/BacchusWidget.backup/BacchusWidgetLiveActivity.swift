import ActivityKit
import WidgetKit
import SwiftUI

// MARK: - Live Activity Widget Configuration
@available(iOS 16.1, *)
struct BacchusLiveActivityWidget: Widget {
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

// MARK: - Live Activity Attributes
struct BacchusActivityAttributes: ActivityAttributes {
    public typealias ContentState = ContentStateData

    public struct ContentStateData: Codable, Hashable {
        // Dynamic stateful properties about the activity go here
        var currentBAC: Double
        var timeToSober: String
        var targetBAC: Double // e.g., 0.51 g/L for legal limit, 0.00 for sober
        var lastUpdated: Date
    }

    // Fixed non-changing properties about the activity go here
    var userName: String
}

// MARK: - Live Activity Views
@available(iOS 16.1, *)
struct BacchusLiveActivityView: View {
    let context: ActivityViewContext<BacchusActivityAttributes>

    var body: some View {
        VStack(alignment: .leading) {
            HStack {
                Image(systemName: "wineglass.fill")
                    .foregroundColor(bacColor)
                Text("BAC: \(String(format: "%.2f", context.state.currentBAC)) g/L")
                    .font(.headline)
                    .foregroundColor(.white)
                Spacer()
                Text(context.state.lastUpdated, style: .time)
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.7))
            }
            .padding(.bottom, 2)

            ProgressView(value: progressValue) {
                Text("Tempo alla sobrietà: \(context.state.timeToSober)")
                    .font(.caption2)
                    .foregroundColor(.white.opacity(0.8))
            }
            .progressViewStyle(.linear)
            .tint(bacColor)
        }
        .padding()
        .activityBackgroundTint(.black)
        .activitySystemActionForegroundColor(.white)
    }

    private var bacColor: Color {
        if context.state.currentBAC >= 0.8 {
            return .red
        } else if context.state.currentBAC >= 0.5 {
            return .orange
        } else if context.state.currentBAC >= 0.2 {
            return .yellow
        } else {
            return .green
        }
    }

    private var progressValue: Double {
        if context.state.targetBAC <= 0.01 {
            // Progress to sobriety (reverse: high BAC = low progress)
            return max(0, 1 - (context.state.currentBAC / 1.0))
        } else {
            // Progress to legal limit
            if context.state.currentBAC <= context.state.targetBAC {
                return 1.0 // Already at target
            } else {
                return max(0, 1 - ((context.state.currentBAC - context.state.targetBAC) / (1.0 - context.state.targetBAC)))
            }
        }
    }
}

@available(iOS 16.1, *)
struct BacchusLiveActivityDynamicIsland {
    let context: ActivityViewContext<BacchusActivityAttributes>

    var body: DynamicIsland {
        DynamicIsland {
            // Expanded view
            DynamicIslandExpandedRegion(.leading) {
                HStack {
                    Image(systemName: "wineglass.fill")
                        .foregroundColor(bacColor)
                    Text(String(format: "%.2f", context.state.currentBAC))
                        .font(.title2)
                        .foregroundColor(.white)
                }
            }
            DynamicIslandExpandedRegion(.trailing) {
                Text(context.state.timeToSober)
                    .font(.title2)
                    .foregroundColor(.white)
            }
            DynamicIslandExpandedRegion(.bottom) {
                ProgressView(value: progressValue)
                    .tint(bacColor)
            }
        } compactLeading: {
            Image(systemName: "wineglass.fill")
                .foregroundColor(bacColor)
        } compactTrailing: {
            Text(String(format: "%.2f", context.state.currentBAC))
                .font(.caption2)
                .foregroundColor(.white)
        } minimal: {
            // Minimal view (dot)
            Circle()
                .fill(bacColor)
                .frame(width: 12, height: 12)
        }
    }

    private var bacColor: Color {
        if context.state.currentBAC >= 0.8 {
            return .red
        } else if context.state.currentBAC >= 0.5 {
            return .orange
        } else if context.state.currentBAC >= 0.2 {
            return .yellow
        } else {
            return .green
        }
    }

    private var progressValue: Double {
        if context.state.targetBAC <= 0.01 {
            // Progress to sobriety (reverse: high BAC = low progress)
            return max(0, 1 - (context.state.currentBAC / 1.0))
        } else {
            // Progress to legal limit
            if context.state.currentBAC <= context.state.targetBAC {
                return 1.0 // Already at target
            } else {
                return max(0, 1 - ((context.state.currentBAC - context.state.targetBAC) / (1.0 - context.state.targetBAC)))
            }
        }
    }
}