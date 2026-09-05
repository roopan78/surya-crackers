import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from '../header/header';
import { Footer } from '../footer/footer';
import { BackToTop } from '../back-to-top/back-to-top';

/**
 * Shared chrome for all customer-facing storefront pages (Home, Product
 * Detail, Checkout) — persistent header + footer wrapping a routed
 * outlet. Kept separate from the Admin shell and the full-screen Age
 * Verification interstitial, which each own their own layout.
 */
@Component({
  selector: 'app-storefront-layout',
  standalone: true,
  imports: [RouterOutlet, Header, Footer, BackToTop],
  templateUrl: './storefront-layout.html',
})
export class StorefrontLayout {}
