enum EControls {
    LeftArrowKey = 37,
    RightArrowKey = 39,
    XKey = 88
}

enum EIndicatorIds {
    Right,
    Left,
    Hazards
}

export default class AutoIndicators {
    private static LocalPlayer: PlayerMp = mp.players.local;

    private static readonly CheckIndicatorsTimeMs: number = 100;
    private static readonly SpamDelayMs: number = 250;
    private static readonly MinimumSteeringRange: number = 30;
    private static readonly SyncIndicatorStatesServerEvent: string = "S::AutoIndicators:SetIndicatorData";
    private static readonly VehicleIndicatorStateKey: string = "AutoIndicatorsShared@vehicle";

    /* Event names */
    private static readonly RightFullLockSteerEvent: string = "steeringRightFullLock";
    private static readonly LeftFullLockSteerEvent: string = "steeringLeftFullLock";

    private static IsIndicating: boolean;
    private static TimeLastClicked: number = new Date().getTime();

    constructor() {
        mp.events.add("entityStreamIn", AutoIndicators.HandleStreamIn);

        mp.keys.bind(EControls.LeftArrowKey, false, () => AutoIndicators.SetIndicator(EIndicatorIds.Left));
        mp.keys.bind(EControls.RightArrowKey, false, () => AutoIndicators.SetIndicator(EIndicatorIds.Right));
        mp.keys.bind(EControls.XKey, false, () => AutoIndicators.SetIndicator(EIndicatorIds.Hazards));

        mp.events.addDataHandler(AutoIndicators.VehicleIndicatorStateKey, AutoIndicators.ApplyIndicatorStateSync);

        setInterval(() => {
            AutoIndicators.CheckSteeringAngle();
        }, AutoIndicators.CheckIndicatorsTimeMs);
    }

    private static GetLocalVehicleIndicatorSharedStates(): boolean[] {
        let vehicle: VehicleMp = AutoIndicators.LocalPlayer.vehicle;

        if (vehicle && vehicle.getVariable(AutoIndicators.VehicleIndicatorStateKey)) {
            return vehicle.getVariable(AutoIndicators.VehicleIndicatorStateKey);
        }

        return [false, false];
    }

    private static SetIndicator(indicatorId: EIndicatorIds) {
        if (!AutoIndicators.LocalPlayer.vehicle) return;

        if (AutoIndicators.LocalPlayer.vehicle.getPedInSeat(-1) !== AutoIndicators.LocalPlayer.handle) return;

        let currentTime: number = new Date().getTime();

        if (currentTime - AutoIndicators.TimeLastClicked < AutoIndicators.SpamDelayMs) return;

        AutoIndicators.TimeLastClicked = currentTime;

        let lightStates: boolean[] = AutoIndicators.GetLocalVehicleIndicatorSharedStates();

        if (indicatorId === EIndicatorIds.Hazards) {
            let toggleState: boolean = lightStates[EIndicatorIds.Left] && lightStates[EIndicatorIds.Right];

            lightStates[EIndicatorIds.Left] = !toggleState;
            lightStates[EIndicatorIds.Right] = !toggleState;
        } else {
            lightStates[indicatorId === EIndicatorIds.Left ? EIndicatorIds.Right : EIndicatorIds.Left] = false;
            lightStates[indicatorId] = !lightStates[indicatorId];
        }

        mp.events.callRemote(AutoIndicators.SyncIndicatorStatesServerEvent, JSON.stringify(lightStates));
    }

    private static HandleStreamIn(entity: EntityMp) {
        if (entity.type !== RageEnums.EntityType.VEHICLE) return;

        AutoIndicators.ApplyIndicatorStateSync(entity as VehicleMp);
    }

    private static ApplyIndicatorStateSync(vehicle: VehicleMp) {
        let lightStates: boolean[] = vehicle.getVariable(AutoIndicators.VehicleIndicatorStateKey);

        if (!lightStates) return;

        vehicle.setIndicatorLights(EIndicatorIds.Left, lightStates[EIndicatorIds.Left]);
        vehicle.setIndicatorLights(EIndicatorIds.Right, lightStates[EIndicatorIds.Right]);
    }

    private static StopIndicating() {
        if (!AutoIndicators.IsIndicating) return;

        AutoIndicators.IsIndicating = false;

        let lightStates: boolean[] = AutoIndicators.GetLocalVehicleIndicatorSharedStates();

        lightStates[EIndicatorIds.Left] = false;
        lightStates[EIndicatorIds.Right] = false;

        mp.events.callRemote(AutoIndicators.SyncIndicatorStatesServerEvent, JSON.stringify(lightStates));
    }

    private static StartIndicating(isRightIndicator: boolean) {
        if (AutoIndicators.IsIndicating) return;

        AutoIndicators.IsIndicating = true;

        let lightStates: boolean[] = [
            false, false
        ];

        isRightIndicator ? lightStates[EIndicatorIds.Right] = true : lightStates[EIndicatorIds.Left] = true;

        mp.events.call(isRightIndicator ? AutoIndicators.RightFullLockSteerEvent : AutoIndicators.LeftFullLockSteerEvent);

        mp.events.callRemote(AutoIndicators.SyncIndicatorStatesServerEvent, JSON.stringify(lightStates));
    }

    private static CheckSteeringAngle() {
        if (!AutoIndicators.LocalPlayer.vehicle) return;

        let vehicle: VehicleMp = AutoIndicators.LocalPlayer.vehicle;

        const angle: number = vehicle.steeringAngle;

        if (vehicle.getPedInSeat(-1) !== AutoIndicators.LocalPlayer.handle) return;

        if (Math.abs(angle) < AutoIndicators.MinimumSteeringRange || !AutoIndicators.LocalPlayer.vehicle.getIsEngineRunning()) {
            AutoIndicators.StopIndicating();
            return;
        }

        AutoIndicators.StartIndicating(Math.sign(angle) === -1);
    }
}