# from .models import Music, PlaySession, EqualizerPreset
# Create default presets in a data migration or management command
def create_default_presets():
    presets = [
        {
            'name': 'Normal',
            'description': 'No equalization applied',
            'values': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        },
        {
            'name': 'Pop',
            'description': 'Enhanced vocals and mid-high frequencies',
            'values': [-1.5, -1, 0, 2, 3, 3, 2, 1, 1.5, 1]
        },
        {
            'name': 'Rock',
            'description': 'Boosted lows and highs for more energy',
            'values': [3, 2, 1, 0, -0.5, 0, 1, 2, 3, 3]
        },
        {
            'name': 'Jazz',
            'description': 'Warm mids and clear highs',
            'values': [2, 1, 0, -0.5, 0, 1, 2, 1, 1, 2]
        },
        {
            'name': 'Classical',
            'description': 'Natural sound with subtle enhancements',
            'values': [2, 2, 1, 0, 0, 0, 0, 1, 1.5, 2]
        },
        {
            'name': 'Bass Boost',
            'description': 'Enhanced low frequencies',
            'values': [5, 4, 3, 2, 1, 0, 0, 0, 0, 0]
        },
        {
            'name': 'Treble Boost',
            'description': 'Enhanced high frequencies',
            'values': [0, 0, 0, 0, 0, 1, 2, 3, 4, 5]
        },
    ]
    
    for preset in presets:
        values = preset['values']
        EqualizerPreset.objects.get_or_create(
            name=preset['name'],
            defaults={
                'description': preset['description'],
                'band_31': values[0],
                'band_62': values[1],
                'band_125': values[2],
                'band_250': values[3],
                'band_500': values[4],
                'band_1k': values[5],
                'band_2k': values[6],
                'band_4k': values[7],
                'band_8k': values[8],
                'band_16k': values[9],
            }
        )

