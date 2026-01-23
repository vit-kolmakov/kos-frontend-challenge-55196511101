import { Component, computed, inject } from "@angular/core";
import { AssetService } from "@/app/services/asset.service";
import {
  AssetMetadata,
  AssetTelemetry,
  AssetLabels,
  ContainerProperties,
  OrderProperties,
  ToolProperties,
  PositionUpdate,
} from "@/app/models/asset.model";
import { toSignal, toObservable } from "@angular/core/rxjs-interop";
import { filter, map, switchMap, startWith } from "rxjs/operators";
import { DatePipe, NgTemplateOutlet } from "@angular/common";
import { of } from "rxjs";

@Component({
  selector: "app-control-panel",
  templateUrl: "./control-panel.html",
  styleUrl: "./control-panel.css",
  imports: [DatePipe, NgTemplateOutlet],
  host: {
    "[class.open]": "!!selectedId()",
  },
})
export class ControlPanelComponent {
  readonly #assetService = inject(AssetService);

  protected readonly selectedId = this.#assetService.selectedId;

  /**
   * INFO: Static Metadata for the selection.
   * Only recalculates when the selectedId changes.
   */
  protected readonly selectedAssetMetadata = computed<AssetMetadata | null>(
    () => {
      const id = this.selectedId();
      if (id === null) return null;
      return this.#assetService.metadata().get(id) ?? null;
    },
  );

  /**
   * INFO: Live Telemetry strictly for the selected asset
   * Uses RxJS filter to ensure this signal ONLY updates when the
   * selected asset actually receives a new position from the worker.
   */
  protected readonly selectedLiveTelemetry = toSignal<AssetTelemetry | null>(
    toObservable(this.selectedId).pipe(
      switchMap((id: number | null) => {
        if (id === null) return of(null);

        // Start with the existing value in the Map
        const initial = this.#assetService.latestPositions.get(id);
        const initialMap = initial ? this.#mapToTelemetry(initial) : null;

        // Then listen for live updates
        return this.#assetService.positionStream$.pipe(
          filter((update) => update.objectId === id),
          map((update) => this.#mapToTelemetry(update)),
          startWith(initialMap),
        );
      }),
    ),
  );

  #mapToTelemetry(update: PositionUpdate): AssetTelemetry {
    return {
      x: update.x.toFixed(2),
      y: update.y.toFixed(2),
      angle: ((update.angle * 180) / Math.PI).toFixed(0),
      battery: update.battery,
      isValid: update.isValid,
      lastSeen: update.timestamp,
    };
  }

  protected deselect(): void {
    this.#assetService.deselect();
  }

  /**
   * INFO: Type Guards
   * Necessary to properly narrow the AssetProperties type for the template switch block
   */
  protected getAssetType(metadata: AssetMetadata): AssetLabels {
    return metadata.labels[0];
  }

  protected asContainer(props: any): ContainerProperties {
    return props as ContainerProperties;
  }

  protected asOrder(props: any): OrderProperties {
    return props as OrderProperties;
  }

  protected asTool(props: any): ToolProperties {
    return props as ToolProperties;
  }
}
