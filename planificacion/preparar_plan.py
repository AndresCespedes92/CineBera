import json
from pathlib import Path

base = Path(__file__).parent
path = base / 'backlog.json'
p = json.loads(path.read_text(encoding='utf-8'))
if len(p['sprints']) == 12:
    mapping = {1: 1, 2: 1, 3: 2, 4: 2, 5: 3, 6: 3, 7: 3, 8: 4, 9: 4, 10: 5, 11: 5, 12: 6}
    for card in p['historias'] + p['tecnicas']:
        if card.get('sprint'):
            card['sprint'] = mapping[card['sprint']]
    p['sprints'] = [
        dict(numero=1, dias='1-4', entrega_dia=4, objetivo='Base desplegada, roles y cartelera', demo='URL Angular + Supabase, registro/login y roles; admin crea/publica película y cliente busca por nombre/género; formulario de fechas ágil.', riesgo='Confirmar acceso, datos de registro y diseño. Roles y base de auditoría son habilitadores.'),
        dict(numero=2, dias='5-8', entrega_dia=8, objetivo='Salas, programación y primera compra', demo='Mapa accesible/VIP, asignación automática con 30 minutos de margen, compra invitada/registrada con restricción de edad y disponibilidad en dos sesiones.', riesgo='Concurrencia y pago son ruta crítica. Confirmar distribución accesible, recurrencias, edad del invitado y precio VIP.'),
        dict(numero=3, dias='9-12', entrega_dia=12, objetivo='Operación completa: QR, candy, cupones y opiniones', demo='PDF y QR compartido, candy y descuentos configurables, validación manual/escáner sin doble consumo; reseñas, promedio, top 3 y reporte diario base.', riesgo='Sprint de mayor carga. Secuencia: cupón/PDF -> candy -> validación -> reportes; reseñas/ranking en carril independiente si hay equipo. Ajustar tamaño de tareas según capacidad.'),
        dict(numero=4, dias='13-16', entrega_dia=16, objetivo='Fidelización, combos, estrenos y preventa', demo='Puntos y canje con historial, combo de precio fijo, Próximamente y alerta al abrir preventa, cambio a precio normal y Mis películas.', riesgo='Alta carga. No iniciar saldos ni notificaciones sin resolver políticas de acumulación, canjes, canal y límites de preventa.'),
        dict(numero=5, dias='17-20', entrega_dia=20, objetivo='Cancelación, crédito, reportes finales y auditoría', demo='Cancelar hasta 2 h antes, usar crédito con otro pago, exportar PDF/Excel, gráficos semanal/mensual y candy más vendido, consulta de log por actor/fecha.', riesgo='Conciliar cancelaciones con QR, disponibilidad, puntos, cupones, canjes y facturación. Instrumentación del log ya existe desde S1.'),
        dict(numero=6, dias='21-24', entrega_dia=24, objetivo='PWA, cierre integral y preparación de entrega', demo='PWA instalable, pruebas de recorridos y reglas críticas, URL funcional, GitHub y README de arquitectura, documento de requisitos y guion de defensa.', riesgo='Reserva de estabilización. Cada sprint previo debe desplegar y probar; no acumular integración para S6.')
    ]
    for sprint in p['sprints']:
        sprint['tarjetas'] = [c['id'] for c in p['historias'] + p['tecnicas'] if c.get('sprint') == sprint['numero']]
    # Sustituir referencias del borrador de 12 sprints en notas y preguntas.
    import re
    for card in p['historias'] + p['dudas']:
        for k in ('nota', 'resolver_antes'):
            if k in card:
                card[k] = re.sub(r'S(1[0-2]|[1-9])\b', lambda m: 'S'+str(mapping[int(m[1])]), card[k])
p['calendario'] = dict(inicio=None, duracion_sprint_dias=4, tipo_dias='corridos como supuesto de planificación', entregas='días 4, 8, 12, 16, 20 y 24', fecha_limite='2026-10-05', fecha_limite_nota='5 de octubre indicado por el usuario; año 2026 según contexto del TP', margen='Si el día 1 es 09/09, el día 24 es 02/10 y quedan 03-05/10 para contingencia/entrega. Es una referencia de viabilidad, no una fecha inicial acordada.')
p['advertencias_plan'] = [
    'Las fechas de 2020 son la cronología ficticia de los correos, no fechas del sprint.',
    'Plan solicitado en días relativos; entrega académica el 5 de octubre de 2026. Seis sprints de cuatro días = 24 días de trabajo calendario.',
    'Plan exigente y provisional: faltan dedicación e integrantes para validar capacidad. No se garantiza alcance solo por asignar tarjetas a una fecha.',
    'S3 y S4 tienen mucha carga. Revisar capacidad al final de cada sprint; si no alcanza, acordar simplificaciones con la cátedra, sin omitir requisitos en silencio.',
    'Orden del backlog por correo; ejecución por dependencias y versión final de los requisitos.',
    'HU41 no está aprobada y no integra ningún sprint.',
    'No se programa ninguna automatización ni se construye la aplicación en esta tarea.'
]
p['estado'] = 'Plan relativo ajustado al 5 de octubre; pendiente de validar capacidad y publicar en Miro'
path.write_text(json.dumps(p, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')

all_cards = {c['id']: c for c in p['historias'] + p['tecnicas']}
assigned = [id for s in p['sprints'] for id in s['tarjetas']]
assert len(assigned) == len(set(assigned)) == 45
assert set(assigned) == set(all_cards)-{'HU41'}
for c in p['historias']:
    for dep in c.get('dependencias', []):
        assert dep in all_cards, (c['id'], dep)
        if c['sprint'] is not None:
            assert all_cards[dep]['sprint'] <= c['sprint'], (c['id'], dep)

lines = ['# Proyecto Cine: historias de usuario y plan de sprints', '', 'Fuente: TP 1 - Programacion IV - 2026 C2.pdf (10 páginas). Se analizaron los 10 correos en su orden original y la consigna general.', '', 'Entrega académica: **5 de octubre de 2026**. Plan relativo: **6 sprints de 4 días**. Cada sprint termina con una demostración y una versión desplegada. 40 historias comprometidas + 5 tarjetas técnicas; 1 historia sin aprobación fuera del plan.', '', '## Calendario relativo', '', '| Sprint | Días | Entrega | Objetivo |', '|---|---|---|---|']
for s in p['sprints']:
    lines.append(f"| S{s['numero']} | {s['dias']} | Día {s['entrega_dia']} | {s['objetivo']} |")
lines += ['', p['calendario']['margen'], '', '## Condiciones del plan', ''] + ['- '+x for x in p['advertencias_plan']]
lines += ['', '## Evolución de requisitos', '', '| Correo | Fecha | Páginas PDF | Cambio |', '|---|---|---|---|']
for c in p['correos']:
    lines.append(f"| {c['id']} | {c['fecha']} | {c['paginas']} | {c['tema']} |")
lines += ['', 'El 20% inicial evoluciona a porcentaje configurable. La distribución A-T original se adapta con fila accesible y VIP. El mismo QR exige definir consumos de cine/candy. El mapa del edificio permanece no aprobado; el mapa de butacas sí es obligatorio.', '', '## Tarjetas por orden de correo', '']
for c in p['correos']:
    lines += [f"### {c['id']} · {c['fecha']} · {c['tema']}", '']
    for h in p['historias']:
        if h['correo'] != c['id']:
            continue
        lines += [f"#### {h['id']} · {h['titulo']}", '', f"**Como** {h['como']}, **quiero** {h['quiero']}, **para** {h['para']}.", '', f"Sprint: {'S'+str(h['sprint']) if h['sprint'] else 'Fuera de plan, sin aprobación'} | Prioridad: {h['prioridad']} | Estado: pendiente", '', '**Criterios de aceptación**', '']
        lines += [f"{i}. {a}" for i,a in enumerate(h['criterios'],1)]
        lines += ['', 'Dependencias: '+(', '.join(h.get('dependencias', [])) or 'ninguna')+'.']
        for k in ('evolucion','nota','estado'):
            if h.get(k): lines += ['', k.capitalize()+': '+h[k]]
        if h.get('dudas'): lines += ['', 'Preguntas asociadas: '+', '.join(h['dudas'])+'.']
        lines += ['']
lines += ['## Tarjetas técnicas y de entrega', '']
for c in p['tecnicas']:
    lines += [f"### {c['id']} · {c['titulo']} · S{c['sprint']}", '', 'Fuente: '+c['fuente'], ''] + ['- '+x for x in c['criterios']] + ['']
lines += ['## Plan detallado de cada sprint', '']
for s in p['sprints']:
    lines += [f"### Sprint {s['numero']} · días {s['dias']} · entrega día {s['entrega_dia']}", '', '**Objetivo:** '+s['objetivo'], '', '**Tarjetas:** '+', '.join(s['tarjetas']), '', '**Demostración de entrega:** '+s['demo'], '', '**Riesgo/dependencia:** '+s['riesgo'], '']
lines += ['## Ritmo de cuatro días', ''] + ['- '+x for x in p['ritmo']] + ['', '## Definición de terminado para cada entrega', ''] + ['- '+x for x in p['definicion_terminado']]
lines += ['', '## Preguntas a validar antes de implementar', '', 'Las siguientes propuestas son decisiones sugeridas, no requisitos confirmados del cliente.', '']
for d in p['dudas']:
    lines += [f"### {d['id']} · {d['tema']}", '', d['pregunta'], '', '**Resolver antes:** '+d['resolver_antes'], '', '**Propuesta a validar:** '+d['propuesta'], '']
(base/'historias-y-sprints.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')

notes=[]
for c in p['correos']:
    for h in p['historias']:
        if h['correo']!=c['id']:continue
        note=f"{h['id']} | {h['titulo']} | {c['id']} {c['fecha']} | "+(f"S{h['sprint']} · Día {h['sprint']*4}" if h['sprint'] else 'NO APROBADA · SIN SPRINT')+f" | Como {h['como']}, quiero {h['quiero']}, para {h['para']}. | Aceptación: "+' '.join(f"{i}) {a}" for i,a in enumerate(h['criterios'],1))
        if h.get('dependencias'): note+=' | Dep: '+', '.join(h['dependencias'])
        if h.get('evolucion'):note+=' | Evolución: '+h['evolucion']
        if h.get('dudas'):note+=' | Validar: '+', '.join(h['dudas'])
        notes.append(note)
for t in p['tecnicas']:
    notes.append(f"{t['id']} | {t['titulo']} | S{t['sprint']} · Día {t['sprint']*4} | Fuente: {t['fuente']} | "+' '.join(t['criterios']))
(base/'tarjetas-miro.txt').write_text('\n'.join(notes),encoding='utf-8')
summary=[]
for s in p['sprints']:
    summary.append(f"SPRINT {s['numero']} | Días {s['dias']} | ENTREGA DÍA {s['entrega_dia']} | {s['objetivo']} | Tarjetas: {', '.join(s['tarjetas'])}. | Demo: {s['demo']} | Riesgo: {s['riesgo']}")
summary.append('ENTREGA FINAL | 5 DE OCTUBRE 2026 | Plan relativo: seis sprints de cuatro días. Inicio no fijado. Si D1=09/09, D24=02/10 y quedan 03-05/10 de contingencia. Capacidad pendiente de validar. Cada entrega: criterios demostrados + URL desplegada + GitHub + evidencia + requisitos actualizados. HU41 queda fuera de alcance por falta de aprobación.')
summary.append('RITMO DEL SPRINT | Día 1: alcance, dudas, diseño/datos. Día 2: recorrido principal e integración. Día 3: casos alternativos, permisos y pruebas. Día 4: corregir, desplegar, demostrar y retrospectiva. Las fechas 2020 identifican correos ficticios; no son fechas de entrega.')
(base/'sprints-miro.txt').write_text('\n'.join(summary),encoding='utf-8')
(base/'dudas-miro.txt').write_text('\n'.join(f"{d['id']} | {d['tema']} | Resolver antes: {d['resolver_antes']} | {d['pregunta']} | Propuesta NO confirmada: {d['propuesta']}" for d in p['dudas']),encoding='utf-8')
print(f"Plan validado: {len(p['historias'])} historias, {len(p['tecnicas'])} técnicas, {len(p['sprints'])} sprints, {len(p['dudas'])} preguntas. {len(assigned)} tarjetas comprometidas sin duplicados ni dependencias asignadas después.")
