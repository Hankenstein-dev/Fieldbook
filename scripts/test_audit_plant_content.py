"""Checks for source cleaning mistakes that would alter extraction evidence."""
import unittest

from audit_plant_content import clean_wikitext, select_sources


class EvidenceCleaningTests(unittest.TestCase):
    def test_preserves_qualifications_and_units(self):
        result = clean_wikitext('Not edible raw; only the ripe fruit is used. {{citation needed|date=May 2024}} {{cn}} {{convert|30|cm}}')
        self.assertIn('Not edible raw; only the ripe fruit is used.', result)
        self.assertIn('{{citation needed|date=May 2024}}', result)
        self.assertIn('{{cn}}', result)
        self.assertIn('{{convert|30|cm}}', result)

    def test_skips_nested_bibliography_but_resumes_content(self):
        result = clean_wikitext('Lead.\n== References ==\nBook.\n=== More ===\nOther book.\n== Uses ==\nFruit is used.')
        self.assertNotIn('Book.', result)
        self.assertNotIn('Other book.', result)
        self.assertIn('Fruit is used.', result)

    def test_removes_ref_titles_not_claims(self):
        result = clean_wikitext('Toxic to cattle.<ref>{{cite journal|title=Edible plants}}</ref>\n[[Category:Plants]]')
        self.assertEqual(result, 'Toxic to cattle.')

    def test_keeps_unknown_nested_factual_templates(self):
        result = clean_wikitext('{{quote|text=Uncertain {{small|historical}} use.}}')
        self.assertEqual(result, '{{quote|text=Uncertain {{small|historical}} use.}}')

    def test_foreign_backmatter(self):
        result = clean_wikitext('Planta.\n== Referências ==\nLivro.\n== Habitat ==\nDunas.')
        self.assertNotIn('Livro.', result)
        self.assertIn('Dunas.', result)

    def test_exact_taxon_takes_precedence_over_language(self):
        record = {'sources':[
            {'status':'available','language':'en','path':'genus','scope':'broader_taxon'},
            {'status':'available','language':'pt','path':'species','scope':'title_matches_scientific_name'}],
            'botanicalSources':[]}
        selected = select_sources(record, {'genus':{'title':'Genus'},'species':{'title':'Species'}})
        self.assertEqual(selected, [{'title':'Species','scope':'title_matches_scientific_name'}])


if __name__ == '__main__':
    unittest.main()
