import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import recover_plant_sources as sources
from prepare_botanical_web_sources import extract


class ScopeTests(unittest.TestCase):
    def test_qualified_section_requires_correct_parent_and_rank(self):
        with tempfile.TemporaryDirectory() as folder:
            corpus=Path(folder);(corpus/'taxonomy').mkdir()
            (corpus/'taxonomy/1.json').write_text(json.dumps({'taxon':{'ancestors':[{'rank':'genus','name':'Veronica'}]}}))
            row={'taxonId':1,'name':'Hebe','rank':'section'}
            with patch.object(sources,'CORPUS',corpus):
                for title,accepted in [('Veronica sect. Hebe',True),('Other sect. Hebe',False),('Veronica subsect. Hebe',False),('Veronica speciosa',False)]:
                    self.assertEqual(bool(sources.identity(row,{'status':'available','title':title,'wikitext':'A descriptive account.'})),accepted,title)

    def test_infraspecific_synonym_requires_own_narrow_account(self):
        row={'taxonId':1,'name':'Actinidia setosa','rank':'species'}
        for taxon,accepted in [('Actinidia chinensis var. setosa',True),('Actinidia chinensis',False)]:
            article={'status':'available','title':taxon,'wikitext':'{{Speciesbox|taxon='+taxon+'|synonyms=Actinidia setosa}}'}
            self.assertEqual(bool(sources.identity(row,article)),accepted)

    def test_comparison_mention_cannot_supply_another_species_account(self):
        entry={'name':'Bonnemaisonia asparagoides','rank':'species','url':'https://www.seaweed.ie/descriptions/Bonnemaisonia_hamifera.php'}
        raw='Seaweed.ie :: Bonnemaisonia hamifera (https://www.seaweed.ie/)\nL0: Description: A red branched alga found attached to other seaweeds by hooks.\nL1: Similar species: Bonnemaisonia asparagoides lacks hooks.'
        self.assertIsNone(extract(entry,raw)[0])
        entry['name']='Bonnemaisonia hamifera'
        raw+='\nL2: Habitat: Found on rocks and other algae in lower shore pools and shallow subtidal water.'
        self.assertIsNotNone(extract(entry,raw)[0])


if __name__=='__main__':unittest.main()
