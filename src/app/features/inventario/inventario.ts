import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { ProductoService, extraerErrorApi } from '../../core/services/producto.service';
import {
  DashboardResumen,
  Marca,
  ProdEstado,
  Producto,
  ProductoWrite,
  TipoCategoria,
  TipoOperacion,
} from '../../shared/models/producto';

const PAGE_SIZE = 20; // debe coincidir con REST_FRAMEWORK.PAGE_SIZE del backend

interface ProductoForm {
  prod_nombre: string;
  prod_modelo: string;
  descripcion: string;
  proveedor: string;
  tipo_operacion_permitida: TipoOperacion;
  prod_valor_unitario: string;
  prod_estado: ProdEstado;
  prod_cantidad_disponible: number;
  prod_stock_minimo: number;
  tipo_categoria: number | '';
  marca: number | '';
}

function formVacio(): ProductoForm {
  return {
    prod_nombre: '',
    prod_modelo: '',
    descripcion: '',
    proveedor: '',
    tipo_operacion_permitida: 'mixto',
    prod_valor_unitario: '',
    prod_estado: 'Disponible',
    prod_cantidad_disponible: 0,
    prod_stock_minimo: 0,
    tipo_categoria: '',
    marca: '',
  };
}

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inventario.html',
  styleUrl: './inventario.css',
})
export class Inventario implements OnInit {
  private productoService = inject(ProductoService);
  private route = inject(ActivatedRoute);

  // Búsqueda en vivo (debounce)
  searchTerm = '';
  private search$ = new Subject<string>();

  // ── Estado de datos ──────────────────────────────
  productos = signal<Producto[]>([]);
  marcas = signal<Marca[]>([]);
  categorias = signal<TipoCategoria[]>([]);
  dashboard = signal<DashboardResumen['inventario'] | null>(null);

  loading = signal(false);
  error = signal<string | null>(null);

  count = signal(0);
  page = signal(1);
  readonly pageSize = PAGE_SIZE;

  // ── Filtros (ligados con ngModel) ────────────────
  brandFilter: number | '' = '';
  categoryFilter: number | '' = '';
  statusFilter: ProdEstado | '' = '';
  onlyLowStock = false;

  readonly estados: ProdEstado[] = ['Disponible', 'Prestado', 'Mantenimiento', 'Dañado', 'Agotado'];
  readonly tiposOperacion: { value: TipoOperacion; label: string }[] = [
    { value: 'venta', label: 'Solo venta' },
    { value: 'prestamo', label: 'Solo préstamo' },
    { value: 'mixto', label: 'Venta y préstamo' },
  ];

  // ── Modal crear/editar producto ──────────────────
  showModal = signal(false);
  saving = signal(false);
  formError = signal<string | null>(null);
  editing = signal<Producto | null>(null);
  form: ProductoForm = formVacio();
  fotoFile: File | null = null;
  fotoPreview = signal<string | null>(null);

  // ── Confirmación de borrado ──────────────────────
  productoAEliminar = signal<Producto | null>(null);
  deleting = signal(false);
  deleteError = signal<string | null>(null);

  // ── Derivados de paginación ──────────────────────
  totalPages = computed(() => Math.max(1, Math.ceil(this.count() / this.pageSize)));

  pages = computed<number[]>(() => {
    const total = this.totalPages();
    const cur = this.page();
    const start = Math.max(1, cur - 2);
    const end = Math.min(total, cur + 2);
    const arr: number[] = [];
    for (let i = start; i <= end; i++) arr.push(i);
    return arr;
  });

  rangeStart = computed(() => (this.count() === 0 ? 0 : (this.page() - 1) * this.pageSize + 1));
  rangeEnd = computed(() => Math.min(this.page() * this.pageSize, this.count()));

  ngOnInit(): void {
    this.loadCatalogos();
    this.loadDashboard();

    // El buscador del header navega a /inventario?search=... → lo tomamos aquí.
    // queryParamMap emite de inmediato, así que este es también el primer load.
    this.route.queryParamMap.subscribe((params) => {
      this.searchTerm = params.get('search') ?? '';
      this.page.set(1);
      this.loadProductos();
    });

    // Búsqueda en vivo de la propia caja de inventario.
    this.search$.pipe(debounceTime(300), distinctUntilChanged()).subscribe((term) => {
      this.searchTerm = term;
      this.applyFilters();
    });
  }

  onSearch(term: string): void {
    this.search$.next(term);
  }

  // ── Cargas ───────────────────────────────────────
  private loadCatalogos(): void {
    this.productoService.getTodasMarcas().subscribe({
      next: (res) => this.marcas.set(res),
      error: () => this.marcas.set([]),
    });
    this.productoService.getTodasCategorias().subscribe({
      next: (res) => this.categorias.set(res),
      error: () => this.categorias.set([]),
    });
  }

  private loadDashboard(): void {
    this.productoService.getDashboard().subscribe({
      next: (res) => this.dashboard.set(res.inventario),
      error: () => this.dashboard.set(null),
    });
  }

  loadProductos(): void {
    this.loading.set(true);
    this.error.set(null);

    this.productoService
      .getProductos({
        marca: this.brandFilter,
        tipo_categoria: this.categoryFilter,
        prod_estado: this.statusFilter,
        bajo_stock: this.onlyLowStock,
        search: this.searchTerm.trim() || undefined,
        page: this.page(),
      })
      .subscribe({
        next: (res) => {
          this.productos.set(res.results);
          this.count.set(res.count);
          this.loading.set(false);
        },
        error: () => {
          this.productos.set([]);
          this.count.set(0);
          this.error.set('No se pudieron cargar los productos. Verifica tu sesión o el servidor.');
          this.loading.set(false);
        },
      });
  }

  // ── Acciones de filtros / paginación ─────────────
  applyFilters(): void {
    this.page.set(1);
    this.loadProductos();
  }

  clearFilters(): void {
    this.brandFilter = '';
    this.categoryFilter = '';
    this.statusFilter = '';
    this.onlyLowStock = false;
    this.searchTerm = '';
    this.applyFilters();
  }

  get hasFilters(): boolean {
    return (
      !!this.brandFilter ||
      !!this.categoryFilter ||
      !!this.statusFilter ||
      this.onlyLowStock ||
      !!this.searchTerm.trim()
    );
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages() || p === this.page()) return;
    this.page.set(p);
    this.loadProductos();
  }

  // ── Modal crear/editar ───────────────────────────
  openCreate(): void {
    this.editing.set(null);
    this.form = formVacio();
    this.fotoFile = null;
    this.fotoPreview.set(null);
    this.formError.set(null);
    this.showModal.set(true);
  }

  openEdit(p: Producto): void {
    this.editing.set(p);
    this.form = {
      prod_nombre: p.prod_nombre,
      prod_modelo: p.prod_modelo ?? '',
      descripcion: p.descripcion ?? '',
      proveedor: p.proveedor ?? '',
      tipo_operacion_permitida: (p.tipo_operacion_permitida as TipoOperacion) || 'mixto',
      prod_valor_unitario: p.prod_valor_unitario,
      prod_estado: p.prod_estado,
      prod_cantidad_disponible: p.prod_cantidad_disponible,
      prod_stock_minimo: p.prod_stock_minimo,
      tipo_categoria: p.tipo_categoria,
      marca: p.marca,
    };
    this.fotoFile = null;
    this.fotoPreview.set(p.prod_foto_url);
    this.formError.set(null);
    this.showModal.set(true);
  }

  closeModal(): void {
    if (this.saving()) return;
    this.showModal.set(false);
  }

  onFotoChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.fotoFile = file;
    if (file) {
      const reader = new FileReader();
      reader.onload = () => this.fotoPreview.set(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      this.fotoPreview.set(this.editing()?.prod_foto_url ?? null);
    }
  }

  quitarFoto(input: HTMLInputElement): void {
    input.value = '';
    this.fotoFile = null;
    this.fotoPreview.set(this.editing()?.prod_foto_url ?? null);
  }

  saveProducto(): void {
    const f = this.form;

    if (!f.prod_nombre.trim()) {
      this.formError.set('El nombre del producto es obligatorio.');
      return;
    }
    if (f.prod_valor_unitario === '' || Number(f.prod_valor_unitario) < 0 || isNaN(Number(f.prod_valor_unitario))) {
      this.formError.set('Ingresa un valor unitario válido (mayor o igual a 0).');
      return;
    }
    if (f.marca === '' || f.tipo_categoria === '') {
      this.formError.set('Selecciona la marca y la categoría.');
      return;
    }
    if (f.prod_cantidad_disponible < 0 || f.prod_stock_minimo < 0) {
      this.formError.set('Las cantidades no pueden ser negativas.');
      return;
    }

    const payload: ProductoWrite = {
      prod_nombre: f.prod_nombre.trim(),
      prod_modelo: f.prod_modelo.trim() || null,
      descripcion: f.descripcion.trim() || null,
      proveedor: f.proveedor.trim() || null,
      tipo_operacion_permitida: f.tipo_operacion_permitida,
      prod_valor_unitario: f.prod_valor_unitario,
      prod_estado: f.prod_estado,
      prod_cantidad_disponible: Number(f.prod_cantidad_disponible),
      prod_stock_minimo: Number(f.prod_stock_minimo),
      tipo_categoria: f.tipo_categoria,
      marca: f.marca,
    };

    this.saving.set(true);
    this.formError.set(null);

    const editing = this.editing();
    const req$ = editing
      ? this.productoService.updateProducto(editing.prod_id, payload, this.fotoFile)
      : this.productoService.createProducto(payload, this.fotoFile);

    req$.subscribe({
      next: () => {
        this.saving.set(false);
        this.showModal.set(false);
        this.loadProductos();
        this.loadDashboard();
      },
      error: (err) => {
        this.saving.set(false);
        this.formError.set(extraerErrorApi(err, 'No se pudo guardar el producto.'));
      },
    });
  }

  // ── Borrado ──────────────────────────────────────
  askDelete(p: Producto): void {
    this.deleteError.set(null);
    this.productoAEliminar.set(p);
  }

  cancelDelete(): void {
    if (this.deleting()) return;
    this.productoAEliminar.set(null);
  }

  confirmDelete(): void {
    const p = this.productoAEliminar();
    if (!p) return;

    this.deleting.set(true);
    this.deleteError.set(null);

    this.productoService.deleteProducto(p.prod_id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.productoAEliminar.set(null);
        // Si era el último de la página, retrocede una página
        if (this.productos().length === 1 && this.page() > 1) {
          this.page.set(this.page() - 1);
        }
        this.loadProductos();
        this.loadDashboard();
      },
      error: (err) => {
        this.deleting.set(false);
        this.deleteError.set(extraerErrorApi(err, 'No se pudo eliminar el producto.'));
      },
    });
  }
}
