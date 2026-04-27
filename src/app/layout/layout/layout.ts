import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Aside } from '../aside/aside';
import { Footer } from '../footer/footer';
import { Header } from '../header/header';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, Header, Aside, Footer],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
})
export class Layout {

}
