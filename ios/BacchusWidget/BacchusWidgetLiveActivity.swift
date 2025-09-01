import ActivityKit
import WidgetKit
import SwiftUI

// MARK: - Live Activity Attributes
struct BacchusActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        // Dati dinamici che cambiano durante l'attività
        var currentBAC: Double
        var targetBAC: Double // 0.00 se < 0.5, altrimenti 0.51 (limite legale)
        var timeToTarget: String // "2h 15min"
        var lastUpdated: Date
    }
    
    // Dati statici che non cambiano
    var sessionId: String
    var userName: String
}

// MARK: - Live Activity Views
struct BacchusLiveActivityView: View {
    let context: ActivityViewContext<BacchusActivityAttributes>
    
    var body: some View {
        HStack(spacing: 12) {
            // BAC Icon
            ZStack {
                Circle()
                    .fill(bacColor.opacity(0.2))
                    .frame(width: 40, height: 40)
                Circle()
                    .stroke(bacColor, lineWidth: 2)
                    .frame(width: 40, height: 40)
                
                Image(systemName: "wineglass.fill")
                    .foregroundColor(bacColor)
                    .font(.system(size: 16, weight: .semibold))
            }
            
            // BAC Info
            VStack(alignment: .leading, spacing: 2) {
                Text("BAC Level")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Text(String(format: "%.2f g/L", context.state.currentBAC))
                    .font(.headline)
                    .fontWeight(.semibold)
                    .foregroundColor(.primary)
            }
            
            Spacer()
            
            // Progress/Time Info
            VStack(alignment: .trailing, spacing: 2) {
                if context.state.targetBAC <= 0.01 {
                    // Countdown to sober
                    Text("To Sober")
                        .font(.caption)
                        .foregroundColor(.secondary)
                } else {
                    // Countdown to legal limit
                    Text("To 0.51 g/L")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Text(context.state.timeToTarget)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(.primary)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .activitySystemActionForegroundColor(.primary)
        .activityBackgroundTint(.clear)
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
}

// MARK: - Dynamic Island Views
struct BacchusLiveActivityDynamicIsland: View {
    let context: ActivityViewContext<BacchusActivityAttributes>
    
    var body: some View {
        DynamicIsland {
            // Expanded view
            DynamicIslandExpandedRegion(.leading) {
                HStack {
                    Image(systemName: "wineglass.fill")
                        .foregroundColor(bacColor)
                        .font(.title3)
                    
                    VStack(alignment: .leading) {
                        Text("Bacchus")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text(context.attributes.userName)
                            .font(.caption)
                            .fontWeight(.medium)
                    }
                }
                .padding(.leading)
            }
            
            DynamicIslandExpandedRegion(.trailing) {
                VStack(alignment: .trailing) {
                    Text(String(format: "%.2f", context.state.currentBAC))
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(bacColor)
                    
                    Text("g/L")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .padding(.trailing)
            }
            
            DynamicIslandExpandedRegion(.center) {
                VStack {
                    // Progress bar
                    ProgressView(value: progressValue, total: 1.0)
                        .progressViewStyle(LinearProgressViewStyle(tint: bacColor))
                        .scaleEffect(x: 1, y: 2, anchor: .center)
                    
                    Text(context.state.timeToTarget)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .padding(.top, 4)
                }
                .padding(.horizontal)
            }
            
            DynamicIslandExpandedRegion(.bottom) {
                HStack {
                    Image(systemName: "clock")
                        .foregroundColor(.secondary)
                        .font(.caption)
                    
                    Text("Updated \(context.state.lastUpdated, style: .relative) ago")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    Spacer()
                    
                    Text(context.state.targetBAC <= 0.01 ? "To Sober" : "To Legal")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .padding(.horizontal)
            }
            
        } compactLeading: {
            // Compact leading (bubble)
            Image(systemName: "wineglass.fill")
                .foregroundColor(bacColor)
                .font(.system(size: 16, weight: .semibold))
            
        } compactTrailing: {
            // Compact trailing (bubble)
            Text(String(format: "%.2f", context.state.currentBAC))
                .font(.caption)
                .fontWeight(.bold)
                .foregroundColor(bacColor)
            
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