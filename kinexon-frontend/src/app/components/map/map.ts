import {
  Component,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  NgZone,
  inject,
  viewChild,
  HostListener,
  computed,
  effect,
  untracked,
} from "@angular/core";
import { AssetService } from "@/app/services/asset.service";
import { PositionUpdate, AssetMetadata } from "@/app/models/asset.model";

const MAP_SIZE_METERS = 100;

/**
 * MapComponent: The core rendering engine for the asset visualization.
 * It uses an HTML5 Canvas to handle high-frequency updates that would
 * overwhelm standard DOM-based rendering.
 */
@Component({
  selector: "app-map",
  templateUrl: "./map.html",
  styleUrl: "./map.css",
  standalone: true,
})
export class MapComponent implements AfterViewInit {
  readonly #assetService = inject(AssetService);
  readonly #ngZone = inject(NgZone);

  // INFO: Legacy implementation
  // #animationFrameId?: number;

  canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>("mapCanvas");
  #context!: CanvasRenderingContext2D;
  readonly #selectedId = computed(() => this.#assetService.selectedId());

  constructor() {
    /**
     * INFO: Reactive Render Trigger
     * Previously used a continuous 'requestAnimationFrame' loop but opted for a signal-based approach instead.
     * This effect automatically runs whenever the Worker updates the map.
     * Ensuring we will re-evaluate this component on every signal graph event
     * and thus refresh the latestPositions which is pulled from the non-reactive Map.
     * WHY:
     * 1. Efficiency: Continuous loops (60-165Hz) waste energy if data only
     *    arrives at 10Hz (100ms). This effect runs ONLY when the Worker emits data.
     * 2. Battery Life: Significant for mobile/laptop use.
     * 3. Untracked: We use untracked() to prevent 'selectedId' or 'metadata'
     *    changes from triggering the effect. The Worker Signal is the ONLY
     *    authority that starts a render pass. Otherwise, since this.#render() is called inside the effect,
     *    every signal that is read anywhere inside the #render call tree becomes a dependency of the effect.
     */
    effect(() => {
      this.#assetService.triggerMapUpdate();
      untracked(() => {
        if (this.#context) {
          this.#render();
        }
      });
    });
  }

  ngAfterViewInit(): void {
    const canvasElement = this.canvasRef().nativeElement;
    const isP3Supported = window.matchMedia("(color-gamut: p3)").matches;

    this.#context = canvasElement.getContext("2d", {
      colorSpace: isP3Supported ? "display-p3" : "srgb",
      alpha: true,
    })!;

    this.resizeCanvas();
    // INFO: Legacy implementation
    // this.#ngZone.runOutsideAngular(() => this.#gameLoop());
  }

  // INFO: Legacy implementation
  // ngOnDestroy(): void {
  //   if (this.#animationFrameId) cancelAnimationFrame(this.#animationFrameId);
  // }

  // INFO: Legacy implementation
  // #gameLoop = (): void => {
  //   this.#render();
  //   this.#animationFrameId = requestAnimationFrame(this.#gameLoop);
  // };

  @HostListener("window:resize")
  resizeCanvas(): void {
    const canvasElement = this.canvasRef().nativeElement;
    const boundingClientRect = canvasElement.getBoundingClientRect();
    canvasElement.width = boundingClientRect.width;
    canvasElement.height = boundingClientRect.height;
  }

  @HostListener("click", ["$event"])
  handleCanvasClick(event: MouseEvent): void {
    const canvas = this.canvasRef().nativeElement;
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(canvas.width, canvas.height) / MAP_SIZE_METERS;

    // INFO: Normalize coordinates including Device Pixel Ratio
    const dprScaleX = canvas.width / rect.width;
    const dprScaleY = canvas.height / rect.height;

    // INFO: Calculate relative click within the element
    const mouseX = (event.clientX - rect.left) * dprScaleX;
    const mouseY = (event.clientY - rect.top) * dprScaleY;

    const mapX = mouseX / scale;
    const mapY = (canvas.height - mouseY) / scale;

    let closestId: number | null = null;
    let minDistance = 3.0;

    // INFO: Iteratie over the latestPositions Map populated by the Worker
    this.#assetService.latestPositions.forEach((position) => {
      const dx = position.x - mapX;
      const dy = position.y - mapY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < minDistance) {
        minDistance = distance;
        closestId = position.objectId;
      }
    });
    this.#assetService.selectedId.set(closestId);
  }

  #render(): void {
    const canvas = this.canvasRef().nativeElement;
    const { width, height } = canvas;
    const currentPositions = this.#assetService.latestPositions;
    const scale = Math.min(width, height) / MAP_SIZE_METERS;

    // INFO: Always draw the grid, even if no positions exist
    this.#context.clearRect(0, 0, width, height);
    this.#drawGrid(width, height, scale);

    if (currentPositions.size === 0) return;

    const metadataMap = this.#assetService.metadata();
    const selectedId = this.#selectedId();
    let selectedposition: PositionUpdate | null = null;

    // INFO: Pass 1: Non-selected Assets
    currentPositions.forEach((position) => {
      if (position.objectId === selectedId) {
        selectedposition = position;
        return;
      }

      this.#renderAsset(
        position,
        metadataMap.get(position.objectId),
        scale,
        height,
        false,
      );
    });

    // INFO: Pass 2: Selected Asset on drawn last
    if (selectedposition) {
      this.#renderAsset(
        selectedposition,
        metadataMap.get(selectedId!),
        scale,
        height,
        true,
      );
    }

    // INFO: Pass 3: Add legend on top layer
    this.#drawLegend(width);
  }

  // INFO: Specialized render helper to ensure consistent coordinate mapping
  #renderAsset(
    position: PositionUpdate,
    metadata: AssetMetadata | undefined,
    scale: number,
    canvasHeight: number,
    isSelected: boolean,
  ): void {
    this.#context.save();
    this.#context.translate(
      position.x * scale,
      canvasHeight - position.y * scale,
    );
    this.#context.rotate(position.angle);
    this.#drawObject(metadata?.labels || [], position.isValid, isSelected);
    this.#context.restore();
  }

  #drawGrid(width: number, height: number, scale: number): void {
    this.#context.save();
    this.#context.strokeStyle = "oklch(0 0 0 / .3)";
    this.#context.lineWidth = 1;
    this.#context.font = "10px var(--font-mono)";
    this.#context.fillStyle = "oklch(0 0 0 / .5)";

    for (let i = 0; i <= 100; i += 10) {
      const position = i * scale;

      // INFO: Vertical Lines (X-Axis)
      this.#context.beginPath();
      this.#context.moveTo(position, 0);
      this.#context.lineTo(position, height);
      this.#context.stroke();

      // INFO: X-Axis Labels
      if (i > 0 && i < 110) {
        this.#context.fillText(`${i}m`, position + 2, height - 5);
      }

      // INFO: Horizontal Lines (Y-Axis)
      this.#context.beginPath();
      this.#context.moveTo(0, height - position);
      this.#context.lineTo(width, height - position);
      this.#context.stroke();

      // INFO: Y-Axis Labels
      if (i > 0 && i < 100) {
        this.#context.fillText(`${i}m`, 5, height - position - 2);
      }
    }

    /**
     * Explicitly marking (0,0) origin point
     */
    this.#context.font = "bold 12px var(--font-mono)";
    this.#context.fillText("(0,0)", 5, height - 5);

    this.#context.restore();
  }

  #drawObject(
    labels: readonly string[],
    isValid: boolean,
    isSelected: boolean,
  ): void {
    this.#context.globalAlpha = isValid ? 1.0 : 0.3;
    const type = labels.includes("container")
      ? "container"
      : labels.includes("order")
        ? "order"
        : "tool";

    if (isSelected) {
      this.#context.beginPath();
      this.#context.arc(0, 0, 22, 0, Math.PI * 2);
      this.#context.strokeStyle = "oklch(0.5833 0.2335 27.88)";
      this.#context.lineWidth = 4;
      this.#context.stroke();
    }

    /**
     * INFO: Asset Types
     * Container - Blue Square
     * Order - Yellow Triangle
     * Tool - Green Circle
     */
    // RESET PATH FOR SHAPE
    this.#context.beginPath();
    if (type === "container") {
      this.#context.fillStyle = "oklch(0.6855 0.142 233.24)";
      this.#context.fillRect(-12, -12, 24, 24);
    } else if (type === "order") {
      this.#context.fillStyle = "oklch(0.75 0.15 90)";
      this.#context.moveTo(0, -14);
      this.#context.lineTo(14, 10);
      this.#context.lineTo(-14, 10);
      this.#context.closePath();
      this.#context.fill();
    } else {
      this.#context.fillStyle = "oklch(0.6959 0.1491 162.48)";
      this.#context.arc(0, 0, 11, 0, Math.PI * 2);
      this.#context.fill();
    }

    // INFO: Directional Arrow
    this.#context.strokeStyle = "oklch(0.6043 0.2103 35.33)";
    this.#context.lineWidth = 3;
    this.#context.beginPath();
    this.#context.moveTo(0, 0);
    this.#context.lineTo(24, 0);
    this.#context.stroke();
    this.#context.beginPath();
    this.#context.moveTo(24, 0);
    this.#context.lineTo(16, -6);
    this.#context.lineTo(16, 6);
    this.#context.closePath();
    this.#context.fillStyle = "oklch(0.6043 0.2103 35.33)";
    this.#context.fill();
  }

  #drawLegend(canvasWidth: number): void {
    const x = canvasWidth - 170;
    let yStart = 20;
    let y = yStart + 20;
    this.#context.save();
    this.#context.fillStyle = "oklch(0.2976 0.0111 196.57 / .75)";
    this.#context.beginPath();
    this.#context.roundRect(x - 10, yStart, 160, 115, 8);
    this.#context.fill();
    this.#context.font = "bold 1rem";
    this.#context.fillStyle = "oklch(1 0 0)";
    this.#context.fillText("ASSET LEGEND", x, yStart + 18);

    const assets = [
      {
        label: "Container",
        color: "oklch(0.6855 0.142 233.24)",
        type: "square",
      },
      { label: "Order", color: "oklch(0.75 0.15 90)", type: "triangle" },
      { label: "Tool", color: "oklch(0.6959 0.1491 162.48)", type: "circle" },
    ];

    assets.forEach((asset) => {
      y += 25;
      this.#context.fillStyle = asset.color;
      this.#context.beginPath();
      if (asset.type === "square") {
        this.#context.fillRect(x, y - 10, 12, 12);
      } else if (asset.type === "circle") {
        this.#context.arc(x + 6, y - 4, 6, 0, Math.PI * 2);
        this.#context.fill();
      } else {
        this.#context.moveTo(x + 6, y - 12);
        this.#context.lineTo(x + 12, y);
        this.#context.lineTo(x, y);
        this.#context.closePath();
        this.#context.fill();
      }
      this.#context.fillStyle = "oklch(0.967 0.0029 264.54)";
      this.#context.fillText(asset.label, x + 25, y);
    });
    this.#context.restore();
  }
}
