import { Injectable, signal, NgZone, inject, computed } from "@angular/core";
import { PositionUpdate, AssetMetadata } from "@/app/models/asset.model";
import { AsyncService } from "./async.service";
import { Subject, Observable } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class AssetService {
  readonly #ngZone = inject(NgZone);
  readonly #asyncService = inject(AsyncService);

  /**
   * INFO: Since the Map is not a Signal in order to maximize its performance we have to manually track its updates
   * This signal mirrors those updates to provide reactivity by alerting consumers of them
   * without the overhead of converting 250 positions into signals
   */
  readonly triggerMapUpdate = signal(0);
  /**
   * INFO: Retains its shape as a Map for faster lookups - O(1)
   * The Map is non-reactive in order to maximize its performance
   */
  readonly latestPositions = new Map<number, PositionUpdate>();

  /**
   * INFO: Observable to provide reactivity for PositionUpdate changes for the Angular UI componentry
   */
  readonly #positionStream$ = new Subject<PositionUpdate>();
  readonly positionStream$: Observable<PositionUpdate> =
    this.#positionStream$.asObservable();

  /**
   * INFO: The metadata array is transformed into a Map for faster lookups
   */
  readonly metadata = computed(() => {
    const objects = this.#asyncService.assetsResource.value();
    if (!objects) return new Map<number, AssetMetadata>();
    return new Map(objects.map((object) => [object.id, object]));
  });

  /**
   * INFO: Selection state is maintained in the service in order to surface that reactive data for any theoretical future components that would need it
   */
  readonly #selectedId = signal<number | null>(null);
  readonly selectedId = this.#selectedId;

  constructor() {
    this.#initializeWorker();
  }

  deselect(): void {
    this.#selectedId.set(null);
  }

  #initializeWorker(): void {
    if (typeof Worker !== "undefined") {
      this.#ngZone.runOutsideAngular(() => {
        try {
          // INFO: This MUST be a static string literal or Vite will overlook it during the build/transform step
          const worker = new Worker(
            new URL("../workers/position.worker.ts", import.meta.url),
            {
              type: "module",
            },
          );

          worker.onmessage = ({ data }: MessageEvent<ArrayBuffer>) => {
            const wwData = new Float64Array(data);

            /**
             * INFO: Main thread assumes control of the memory location
             */
            const positionUpdate: PositionUpdate = {
              objectId: wwData[0],
              x: wwData[1],
              y: wwData[2],
              angle: wwData[3],
              isValid: wwData[4] === 1,
              battery: wwData[5],
              timestamp: new Date(wwData[6]).toISOString(),
            };

            // INFO: Update the mutable Map for the Canvas
            this.latestPositions.set(positionUpdate.objectId, positionUpdate);

            // INFO: Notify Map consumers of updates
            this.triggerMapUpdate.update((count) => count + 1);

            // INFO: Emit to the Observable stream
            this.#positionStream$.next(positionUpdate);
          };

          worker.onerror = (error) => {
            console.error("[AssetService] Worker startup error:", error);
          };
        } catch (error) {
          console.error("[AssetService] Worker instantiation failed:", error);
        }
      });
    }
  }
}
