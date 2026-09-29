import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { navegacionAdmin } from '../../../models/navegacion-admin';

@Component({selector: 'app-home', imports: [RouterLink], templateUrl: './home.html', styleUrl: './home.css'})
export class Home { enlaces = navegacionAdmin; }
