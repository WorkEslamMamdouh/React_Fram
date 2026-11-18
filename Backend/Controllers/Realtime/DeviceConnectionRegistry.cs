#nullable enable
using System.Collections.Concurrent;

namespace ERP.Realtime
{
    // Tracks which SignalR connection belongs to which device (bridge). W1-1.
    public class DeviceConnectionRegistry
    {
        private readonly ConcurrentDictionary<int, string> _byDevice = new();
        private readonly ConcurrentDictionary<string, int> _byConn = new();

        public void Set(int deviceId, string connectionId)
        {
            _byDevice[deviceId] = connectionId;
            _byConn[connectionId] = deviceId;
        }

        public int? Remove(string connectionId)
        {
            if (_byConn.TryRemove(connectionId, out var deviceId))
            {
                _byDevice.TryRemove(deviceId, out _);
                return deviceId;
            }
            return null;
        }

        public bool IsOnline(int deviceId) => _byDevice.ContainsKey(deviceId);
        public string? ConnectionFor(int deviceId) => _byDevice.TryGetValue(deviceId, out var c) ? c : null;
    }
}
