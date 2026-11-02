"""Read IntGrid meanings once per process from the protected world contract."""

from .project import spec, WorldError


class TerrainSemantics:
    def __init__(self, document):
        self.layers = {
            layer["id"]: {v["id"]: v for v in layer["values"]}
            for layer in document["layers"]
            if layer["type"] == "IntGrid"
        }
        collision = self.layers["collision"].values()
        self.solid = next(v["value"] for v in collision if v.get("flag") == "Solid")
        self.ramp = next(
            v["value"]
            for v in self.layers["collision"].values()
            if v.get("flag") == "Ramp"
        )
        self.decks = frozenset(
            v["value"] for v in self.layers["paths"].values() if v.get("overWater")
        )
        self.heights = {0: 0} | {
            v["value"]: v["elevation"] for v in self.layers["elevation"].values()
        }

    def value(self, layer, identifier):
        try:
            return self.layers[layer][identifier]["value"]
        except KeyError as error:
            raise WorldError(f"Missing map semantic {layer}:{identifier}") from error


TERRAIN = TerrainSemantics(spec())
