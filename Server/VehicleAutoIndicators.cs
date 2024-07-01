using GTANetworkAPI;
using System.Collections.Generic;

namespace Main
{
    public class VehicleAutoIndicators : Script
    {
        public static readonly string VehicleIndicatorStateKey = "AutoIndicatorsShared@vehicle";

        [RemoteEvent("S::AutoIndicators:SetIndicatorData")]
        public static void SetIndicatorData(Player player, string vehicleIndicatorData)
        {
            if (!player.IsInVehicle) return;

            List<bool> indicatorStates = NAPI.Util.FromJson<List<bool>>(vehicleIndicatorData);

            if (indicatorStates.Count > 2 || indicatorStates.Count < 2) return;

            player.Vehicle.SetSharedData(VehicleIndicatorStateKey, indicatorStates);
        }

    }
}
