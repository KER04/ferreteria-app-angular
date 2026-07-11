import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './header.html',
})
export class Header {
  private authService = inject(AuthService);
  private router = inject(Router);

  user$ = this.authService.user$;
  search = '';

  // Lleva la búsqueda al Inventario (que hace la búsqueda en vivo real).
  buscar(): void {
    const term = this.search.trim();
    this.router.navigate(['/inventario'], { queryParams: term ? { search: term } : {} });
  }
}
