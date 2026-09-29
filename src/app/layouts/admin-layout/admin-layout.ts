import { Component } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { Navbar } from '../../components/navbar/navbar';
import { navegacionAdmin } from '../../models/navegacion-admin';

@Component({imports: [RouterOutlet, RouterLink, Navbar], selector: 'app-admin-layout', styleUrl: './admin-layout.css', templateUrl: './admin-layout.html'})
export class AdminLayout { enlaces = navegacionAdmin; }
