import io
from django.views import View
from django.contrib.auth.mixins import LoginRequiredMixin
from django.shortcuts import get_object_or_404, redirect, render
from django.http import HttpResponse, FileResponse
from django.utils import timezone
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from core.models import Contract


# ─────────────────────────────────────────────
# Vue HTML — afficher le contrat dans le navigateur
# ─────────────────────────────────────────────
class ContractDetailView(LoginRequiredMixin, View):
    login_url = '/users/login/'

    def get(self, request, contract_id):
        contract = get_object_or_404(
            Contract,
            id=contract_id,
        )
        # Seuls l'acheteur et le vendeur peuvent voir le contrat
        if request.user not in [contract.buyer, contract.seller]:
            return redirect('core:home')

        return render(request, 'home/contract_detail.html', {'contract': contract})


# ─────────────────────────────────────────────
# Vue PDF — télécharger le contrat en PDF
# ─────────────────────────────────────────────
class ContractPDFView(LoginRequiredMixin, View):
    login_url = '/users/login/'

    def get(self, request, contract_id):
        contract = get_object_or_404(Contract, id=contract_id)

        if request.user not in [contract.buyer, contract.seller]:
            return redirect('core:home')

        buffer = io.BytesIO()
        self._generate_pdf(buffer, contract)
        buffer.seek(0)

        response = HttpResponse(buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="contrat-{contract.contract_number}.pdf"'
        return response

    def _generate_pdf(self, buffer, contract):
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=2*cm,
            leftMargin=2*cm,
            topMargin=2*cm,
            bottomMargin=2*cm,
        )

        styles = getSampleStyleSheet()
        story  = []

        # ── Styles personnalisés ──
        style_title = ParagraphStyle(
            'CustomTitle',
            parent=styles['Title'],
            fontSize=20,
            textColor=colors.HexColor('#000080'),
            spaceAfter=6,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold',
        )
        style_subtitle = ParagraphStyle(
            'Subtitle',
            parent=styles['Normal'],
            fontSize=11,
            textColor=colors.HexColor('#444444'),
            spaceAfter=4,
            alignment=TA_CENTER,
        )
        style_section = ParagraphStyle(
            'Section',
            parent=styles['Heading2'],
            fontSize=12,
            textColor=colors.HexColor('#000080'),
            spaceBefore=14,
            spaceAfter=6,
            fontName='Helvetica-Bold',
            borderPad=4,
        )
        style_body = ParagraphStyle(
            'Body',
            parent=styles['Normal'],
            fontSize=10,
            leading=16,
            alignment=TA_JUSTIFY,
            spaceAfter=4,
        )
        style_right = ParagraphStyle(
            'Right',
            parent=styles['Normal'],
            fontSize=9,
            alignment=TA_RIGHT,
            textColor=colors.grey,
        )
        style_center = ParagraphStyle(
            'Center',
            parent=styles['Normal'],
            fontSize=10,
            alignment=TA_CENTER,
        )

        prop    = contract.property
        buyer   = contract.buyer
        seller  = contract.seller
        loc     = getattr(prop, 'location', None)
        date_str = contract.signed_at.strftime("%d/%m/%Y à %H:%M")

        # ══════════════════════════════════════════
        # EN-TÊTE
        # ══════════════════════════════════════════
        story.append(Paragraph("HOME MARKET", style_title))
        story.append(Paragraph("Plateforme Immobilière Certifiée — Bafoussam, Cameroun", style_subtitle))
        story.append(Spacer(1, 0.3*cm))
        story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#000080')))
        story.append(Spacer(1, 0.3*cm))

        # Type de contrat
        type_label = "CONTRAT DE LOCATION" if contract.contract_type == "RENT" else "CONTRAT DE VENTE IMMOBILIÈRE"
        story.append(Paragraph(type_label, ParagraphStyle(
            'ContractType',
            parent=styles['Title'],
            fontSize=15,
            textColor=colors.HexColor('#000080'),
            alignment=TA_CENTER,
            spaceBefore=6,
            spaceAfter=6,
        )))

        # Numéro et date
        story.append(Paragraph(f"N° <b>{contract.contract_number}</b>", style_center))
        story.append(Paragraph(f"Établi le {date_str}", style_right))
        story.append(Spacer(1, 0.5*cm))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.lightgrey))

        # ══════════════════════════════════════════
        # ARTICLE 1 — PARTIES
        # ══════════════════════════════════════════
        story.append(Paragraph("ARTICLE 1 — IDENTIFICATION DES PARTIES", style_section))

        parties_data = [
            ['', 'VENDEUR / BAILLEUR', 'ACHETEUR / LOCATAIRE'],
            ['Nom & Prénom', f"{seller.first_name} {seller.last_name}", f"{buyer.first_name} {buyer.last_name}"],
            ['Email', seller.email, buyer.email],
            ['Téléphone', getattr(seller, 'phone_number', 'N/A') or 'N/A', getattr(buyer, 'phone_number', 'N/A') or 'N/A'],
            ['Rôle', 'Propriétaire du bien', "Acquéreur / Locataire"],
        ]

        parties_table = Table(parties_data, colWidths=[3.5*cm, 7.5*cm, 7.5*cm])
        parties_table.setStyle(TableStyle([
            ('BACKGROUND',   (0, 0), (-1, 0), colors.HexColor('#000080')),
            ('TEXTCOLOR',    (0, 0), (-1, 0), colors.white),
            ('FONTNAME',     (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE',     (0, 0), (-1, 0), 10),
            ('ALIGN',        (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN',       (0, 0), (-1, -1), 'MIDDLE'),
            ('BACKGROUND',   (0, 1), (0, -1), colors.HexColor('#f0f0f8')),
            ('FONTNAME',     (0, 1), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE',     (0, 1), (-1, -1), 9),
            ('ROWBACKGROUNDS', (1, 1), (-1, -1), [colors.white, colors.HexColor('#f9f9ff')]),
            ('GRID',         (0, 0), (-1, -1), 0.5, colors.HexColor('#ccccdd')),
            ('TOPPADDING',   (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING',(0, 0), (-1, -1), 6),
        ]))
        story.append(parties_table)

        # ══════════════════════════════════════════
        # ARTICLE 2 — BIEN IMMOBILIER
        # ══════════════════════════════════════════
        story.append(Paragraph("ARTICLE 2 — DÉSIGNATION DU BIEN", style_section))

        bien_data = [
            ['Désignation', prop.title],
            ['Type', prop.get_property_type_display()],
            ['Adresse', f"{loc.address if loc else 'N/A'}, {loc.city if loc else ''}, {loc.country if loc else ''}"],
            ['Surface', f"{prop.area_sqm} m²" if prop.area_sqm else 'Non renseignée'],
            ['Chambres', str(prop.bedrooms) if prop.bedrooms else 'N/A'],
            ['Salles de bain', str(prop.bathrooms) if prop.bathrooms else 'N/A'],
            ['Catégorie', prop.category.name if prop.category else 'N/A'],
        ]

        bien_table = Table(bien_data, colWidths=[4.5*cm, 14*cm])
        bien_table.setStyle(TableStyle([
            ('FONTNAME',     (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE',     (0, 0), (-1, -1), 9),
            ('BACKGROUND',   (0, 0), (0, -1), colors.HexColor('#f0f0f8')),
            ('ROWBACKGROUNDS', (1, 0), (-1, -1), [colors.white, colors.HexColor('#f9f9ff')]),
            ('GRID',         (0, 0), (-1, -1), 0.5, colors.HexColor('#ccccdd')),
            ('TOPPADDING',   (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING',(0, 0), (-1, -1), 6),
            ('VALIGN',       (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        story.append(bien_table)

        # ══════════════════════════════════════════
        # ARTICLE 3 — CONDITIONS FINANCIÈRES
        # ══════════════════════════════════════════
        story.append(Paragraph("ARTICLE 3 — CONDITIONS FINANCIÈRES", style_section))

        commission_pct = f"{int(contract.commission / contract.amount * 100)}%" if contract.amount else "5%"
        montant_vendeur = contract.amount - contract.commission

        finance_data = [
            ['Désignation', 'Montant (FCFA)'],
            [f"{'Loyer mensuel' if contract.contract_type == 'RENT' else 'Prix de vente'}", f"{contract.amount:,.0f}"],
            ['Commission Home Market (5%)', f"{contract.commission:,.0f}"],
            ['Montant reversé au vendeur', f"{montant_vendeur:,.0f}"],
            ['Mode de paiement', 'Mobile Money / PayUnit'],
            ['Référence transaction', str(contract.transaction.id)[:16].upper() if contract.transaction else 'N/A'],
        ]

        finance_table = Table(finance_data, colWidths=[11*cm, 7.5*cm])
        finance_table.setStyle(TableStyle([
            ('BACKGROUND',   (0, 0), (-1, 0), colors.HexColor('#000080')),
            ('TEXTCOLOR',    (0, 0), (-1, 0), colors.white),
            ('FONTNAME',     (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE',     (0, 0), (-1, -1), 9),
            ('ALIGN',        (1, 0), (1, -1), 'RIGHT'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9f9ff')]),
            ('FONTNAME',     (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('BACKGROUND',   (0, -3), (-1, -3), colors.HexColor('#e8f5e9')),
            ('GRID',         (0, 0), (-1, -1), 0.5, colors.HexColor('#ccccdd')),
            ('TOPPADDING',   (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING',(0, 0), (-1, -1), 6),
        ]))
        story.append(finance_table)

        # ══════════════════════════════════════════
        # ARTICLE 4 — CLAUSES LÉGALES
        # ══════════════════════════════════════════
        story.append(Paragraph("ARTICLE 4 — CLAUSES ET CONDITIONS", style_section))

        clauses = [
            ("<b>4.1 État du bien :</b> Le vendeur/bailleur certifie que le bien est en bon état d'usage et conforme à la description figurant sur la plateforme Home Market au moment de la signature du présent contrat."),
            ("<b>4.2 Transfert de propriété/jouissance :</b> " + (
                "Le transfert de jouissance du bien est effectif à compter de la date de signature du présent contrat, sous réserve du paiement intégral du loyer convenu."
                if contract.contract_type == "RENT" else
                "Le transfert de propriété sera effectif après accomplissement de toutes les formalités légales requises et paiement intégral du prix de vente."
            )),
            ("<b>4.3 Commission Home Market :</b> Home Market perçoit une commission de 5% sur le montant total de la transaction, en contrepartie des services de mise en relation, sécurisation des paiements et accompagnement des parties."),
            ("<b>4.4 Confidentialité :</b> Les parties s'engagent à maintenir la confidentialité des informations échangées dans le cadre de cette transaction et à ne pas les divulguer à des tiers sans consentement mutuel."),
            ("<b>4.5 Litige :</b> En cas de différend, les parties s'engagent à rechercher une solution amiable avant tout recours judiciaire. À défaut, tout litige sera soumis aux tribunaux compétents de Bafoussam, Cameroun."),
            ("<b>4.6 Validité :</b> Le présent contrat est établi en deux exemplaires originaux, un pour chaque partie, et prend effet à compter de sa date de signature."),
        ]

        for clause in clauses:
            story.append(Paragraph(clause, style_body))
            story.append(Spacer(1, 0.1*cm))

        # ══════════════════════════════════════════
        # ARTICLE 5 — SIGNATURES
        # ══════════════════════════════════════════
        story.append(Spacer(1, 0.5*cm))
        story.append(Paragraph("ARTICLE 5 — SIGNATURES DES PARTIES", style_section))
        story.append(Paragraph(
            f"Fait à Bafoussam, le {date_str}",
            ParagraphStyle('DateLieu', parent=styles['Normal'], fontSize=10, spaceAfter=20, alignment=TA_CENTER)
        ))

        sig_data = [
            ['VENDEUR / BAILLEUR', '', 'ACHETEUR / LOCATAIRE'],
            [f"{seller.first_name} {seller.last_name}", '', f"{buyer.first_name} {buyer.last_name}"],
            ['', '', ''],
            ['', '', ''],
            ['_______________________', '', '_______________________'],
            ['Signature', '', 'Signature'],
        ]

        sig_table = Table(sig_data, colWidths=[7*cm, 4.5*cm, 7*cm])
        sig_table.setStyle(TableStyle([
            ('FONTNAME',  (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE',  (0, 0), (-1, -1), 9),
            ('ALIGN',     (0, 0), (-1, -1), 'CENTER'),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#000080')),
            ('TOPPADDING',(0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(sig_table)

        # ══════════════════════════════════════════
        # PIED DE PAGE LÉGAL
        # ══════════════════════════════════════════
        story.append(Spacer(1, 0.5*cm))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.lightgrey))
        story.append(Spacer(1, 0.2*cm))
        story.append(Paragraph(
            f"Document généré automatiquement par Home Market — homemarket952@gmail.com — "
            f"N° contrat : {contract.contract_number} — Ce document a valeur contractuelle.",
            ParagraphStyle('Footer', parent=styles['Normal'], fontSize=7, textColor=colors.grey, alignment=TA_CENTER)
        ))

        doc.build(story)